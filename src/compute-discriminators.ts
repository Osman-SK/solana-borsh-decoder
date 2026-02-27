import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { sha256 } from "js-sha256";
import { writeFile } from "fs/promises";
import * as path from "path";

// Set up connection
const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

// Dummy wallet for read-only
const dummyKeypair = Keypair.generate();
const wallet = new anchor.Wallet(dummyKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, {});

// Function to compute discriminator (8-byte SHA-256 prefix)
function computeDiscriminator(namespace: string, name: string): number[] {
  const preimage = `${namespace}:${name}`;
  const hash = sha256.arrayBuffer(preimage);
  return Array.from(new Uint8Array(hash.slice(0, 8)));
}

// Transform account from old format to new format
function transformAccount(account: any): any {
  const transformed: any = {
    name: account.name,
  };

  // Transform isMut -> writable
  if (account.isMut !== undefined) {
    if (account.isMut) {
      transformed.writable = true;
    }
  }

  // Transform isSigner -> signer
  if (account.isSigner !== undefined) {
    if (account.isSigner) {
      transformed.signer = true;
    }
  }

  // Transform isOptional -> optional
  if (account.isOptional !== undefined) {
    if (account.isOptional) {
      transformed.optional = true;
    }
  }

  // Copy other properties
  if (account.address !== undefined) {
    transformed.address = account.address;
  }

  if (account.pda !== undefined) {
    transformed.pda = account.pda;
  }

  if (account.relations !== undefined) {
    transformed.relations = account.relations;
  }

  // Handle nested accounts (accounts within accounts)
  if (account.accounts !== undefined) {
    transformed.accounts = account.accounts.map((acc: any) => transformAccount(acc));
  }

  return transformed;
}

// Standardize type definitions
function standardizeType(type: any): any {
  if (typeof type === "string") {
    // Convert "publicKey" to "pubkey" to match Anchor's expected format
    if (type === "publicKey") {
      return "pubkey";
    }
    return type;
  }

  if (type.defined !== undefined) {
    // If defined is already an object with name property, it's already standardized
    if (typeof type.defined === "object" && type.defined.name !== undefined) {
      return type;
    }
    // Otherwise, wrap the string in the proper format
    return {
      defined: {
        name: type.defined,
      },
    };
  }

  if (type.array !== undefined) {
    return {
      array: [standardizeType(type.array[0]), type.array[1]],
    };
  }

  if (type.vec !== undefined) {
    if (typeof type.vec === "string") {
      return {
        vec: type.vec,
      };
    }
    if (type.vec.defined !== undefined) {
      return {
        vec: {
          defined: {
            name: type.vec.defined,
          },
        },
      };
    }
    return {
      vec: standardizeType(type.vec),
    };
  }

  if (type.option !== undefined) {
    return {
      option: standardizeType(type.option),
    };
  }

  return type;
}

// Convert camelCase to snake_case
function camelToSnake(name: string): string {
  return name
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

// Fetch and enhance IDL
async function fetchAndEnhanceIdl(programIdStr: string) {
  const programId = new PublicKey(programIdStr);
  let idl = await anchor.Program.fetchIdl(programId, provider);

  if (!idl) {
    throw new Error("Failed to fetch IDL");
  }

  // Create metadata block
  const metadata = {
    name: (idl as any).name || "unknown",
    version: (idl as any).version || "1.0.0",
    spec: "0.1.0",
    description: `Created with Anchor - ${(idl as any).name || "unknown"}`,
  };

  // Transform instructions with correct field order (matching liquidity.json)
  if (idl.instructions) {
    idl.instructions = idl.instructions.map((ix: any) => {
      // Add discriminator if missing
      if (!ix.discriminator) {
        ix.discriminator = computeDiscriminator("global", ix.name);
      }

      // Transform accounts
      let transformedAccounts = ix.accounts ? ix.accounts.map((acc: any) => transformAccount(acc)) : [];

      // Transform args types
      let transformedArgs = ix.args ? ix.args.map((arg: any) => ({
        name: arg.name,
        type: standardizeType(arg.type),
      })) : [];

      // Return with correct field order: name, discriminator, accounts, args
      const transformedIx = {
        name: ix.name,
        discriminator: ix.discriminator,
        accounts: transformedAccounts,
        args: transformedArgs,
      };

      return transformedIx;
    });

    // Also add snake_case discriminators as aliases for backward compatibility
    // This handles older transactions that used snake_case naming
    const additionalInstructions: any[] = [];
    idl.instructions.forEach((ix: any) => {
      const snakeName = camelToSnake(ix.name);
      if (snakeName !== ix.name) {
        // Check if this snake_case version already exists
        const exists = idl.instructions!.some((i: any) => i.name === snakeName);
        if (!exists) {
          // Add an alias instruction with snake_case name and its discriminator
          additionalInstructions.push({
            name: snakeName,
            discriminator: computeDiscriminator("global", snakeName),
            accounts: ix.accounts,
            args: ix.args,
          });
        }
      }
    });

    // Add the alias instructions
    idl.instructions = [...idl.instructions, ...additionalInstructions];
  }

  // Transform accounts - restructure to match Jupiter format
  // Accounts section should only have name+discriminator, types section has definitions
  if (idl.accounts) {
    // Extract account type definitions to add to types
    const accountTypeDefs = idl.accounts
      .filter((acc: any) => acc.type)  // Only accounts with type definitions
      .map((acc: any) => {
        // Transform the type fields
        let typeDef = { ...acc.type };
        if (typeDef.fields) {
          typeDef.fields = typeDef.fields.map((field: any) => ({
            name: field.name,
            type: standardizeType(field.type),
          }));
        }
        return {
          name: acc.name,
          type: typeDef,
        };
      });

    // Add account type definitions to types section if not already present
    if (!idl.types) {
      idl.types = [];
    }
    
    // Add account types that aren't already in types
    accountTypeDefs.forEach((accType: any) => {
      const exists = idl.types!.some((t: any) => t.name === accType.name);
      if (!exists) {
        idl.types!.push(accType);
      }
    });

    // Transform accounts to only keep name and discriminator
    idl.accounts = idl.accounts.map((acc: any) => {
      if (!acc.discriminator) {
        acc.discriminator = computeDiscriminator("account", acc.name);
      }
      // Return only name and discriminator (remove type field)
      return {
        name: acc.name,
        discriminator: acc.discriminator,
      };
    });
  }

  // Transform types
  if (idl.types) {
    idl.types = idl.types.map((type: any) => {
      // Handle struct types
      if (type.type && type.type.fields) {
        type.type.fields = type.type.fields.map((field: any) => ({
          name: field.name,
          type: standardizeType(field.type),
        }));
      }
      
      // Handle enum types with variant fields
      if (type.type && type.type.variants) {
        type.type.variants = type.type.variants.map((variant: any) => {
          if (variant.fields && Array.isArray(variant.fields)) {
            // Transform fields to proper format
            variant.fields = variant.fields.map((field: any, index: number) => {
              if (typeof field === "string") {
                // Convert string to object format that Anchor expects
                return { name: "value", type: standardizeType(field) };
              }
              // If it's an object without 'type' property but with direct type definition
              if (typeof field === "object" && !field.type) {
                // Check for array type
                if (field.array !== undefined) {
                  return {
                    name: "value",
                    type: { array: [standardizeType(field.array[0]), field.array[1]] },
                  };
                }
                // Check for defined type
                if (field.defined !== undefined) {
                  return {
                    name: "value",
                    type: { defined: { name: field.defined } },
                  };
                }
                // Check for vec type
                if (field.vec !== undefined) {
                  return {
                    name: "value",
                    type: { vec: standardizeType(field.vec) },
                  };
                }
                // Check for option type
                if (field.option !== undefined) {
                  return {
                    name: "value",
                    type: { option: standardizeType(field.option) },
                  };
                }
              }
              // If it's already an object with type property, standardize the type
              if (field.type) {
                return {
                  name: field.name || "value",
                  type: standardizeType(field.type),
                };
              }
              return field;
            });
          }
          return variant;
        });
      }
      return type;
    });
  }

  // Transform events - restructure to match accounts pattern
  // Events section should only have name+discriminator, types section has definitions
  if (idl.events) {
    // Extract event type definitions to add to types
    const eventTypeDefs = idl.events
      .filter((ev: any) => ev.fields)  // Only events with field definitions
      .map((ev: any) => {
        // Transform the fields into a type definition
        const typeDef = {
          kind: "struct",
          fields: ev.fields.map((field: any) => ({
            name: field.name,
            type: standardizeType(field.type),
          })),
        };
        return {
          name: ev.name,
          type: typeDef,
        };
      });

    // Add event type definitions to types section if not already present
    if (!idl.types) {
      idl.types = [];
    }
    
    // Add event types that aren't already in types
    eventTypeDefs.forEach((evType: any) => {
      const exists = idl.types!.some((t: any) => t.name === evType.name);
      if (!exists) {
        idl.types!.push(evType);
      }
    });

    // Transform events to only keep name and discriminator
    idl.events = idl.events.map((ev: any) => {
      if (!ev.discriminator) {
        ev.discriminator = computeDiscriminator("event", ev.name);
      }
      // Return only name and discriminator (remove fields)
      return {
        name: ev.name,
        discriminator: ev.discriminator,
      };
    });
  }

  // Transform errors
  if (idl.errors) {
    // Errors are already in the right format, just pass through
    idl.errors = idl.errors;
  }

  // Construct the final enhanced IDL
  const enhancedIdl = {
    address: programIdStr,
    metadata,
    instructions: idl.instructions || [],
    accounts: idl.accounts || [],
    types: idl.types || [],
    events: idl.events || [],
    errors: idl.errors || [],
  };

  return enhancedIdl;
}

// Main execution
const PROGRAM_ID = "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD";

(async () => {
  try {
    const enhancedIdl = await fetchAndEnhanceIdl(PROGRAM_ID);
    const outputPath = path.join(__dirname, "..", "idl", "klend-enhanced-idl.json");
    await writeFile(outputPath, JSON.stringify(enhancedIdl, null, 2));
    console.log(`Enhanced IDL written to ${outputPath}`);
  } catch (error) {
    console.error("Error enhancing IDL:", error);
    process.exit(1);
  }
})();
