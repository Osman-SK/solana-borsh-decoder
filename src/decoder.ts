import { BorshCoder } from "@coral-xyz/anchor";
import idl_jupiter from "../idl/liquidity.json";
import idl_kamino from "../idl/klend-enhanced-idl.json";

const jupiterCoder = new BorshCoder(idl_jupiter as any);
const kaminoCoder = new BorshCoder(idl_kamino as any);

type Protocol = "jupiter" | "kamino";

interface DecodedInstruction {
  name: string;
  discriminator: string;
  data: Record<string, { type: string; data: any }>;
}

/**
 * Convert type to simplified string representation
 */
function simplifyType(type: any): string {
  if (typeof type === "string") {
    return type;
  }
  
  if (type.array) {
    const elementType = simplifyType(type.array[0]);
    const length = type.array[1];
    return `${elementType}[${length}]`;
  }
  
  if (type.defined && type.defined.name) {
    return type.defined.name;
  }
  
  if (type.vec) {
    const elementType = simplifyType(type.vec);
    return `Vec<${elementType}>`;
  }
  
  if (type.option) {
    const elementType = simplifyType(type.option);
    return `Option<${elementType}>`;
  }
  
  return JSON.stringify(type);
}

/**
 * Format decoded data with type information
 */
function formatDecodedData(
  decodedData: any,
  args: Array<{ name: string; type: any }>
): Record<string, { type: string; data: any }> {
  const result: Record<string, { type: string; data: any }> = {};
  
  for (const arg of args) {
    const rawValue = decodedData[arg.name];
    const typeStr = simplifyType(arg.type);
    
    // Format the value based on its type
    let formattedValue: any;
    
    if (rawValue === null || rawValue === undefined) {
      formattedValue = null;
    } else if (typeof rawValue === "bigint") {
      formattedValue = rawValue.toString();
    } else if (rawValue && typeof rawValue === "object") {
      // Handle PublicKey-like objects or complex types
      if (rawValue.toString && !Array.isArray(rawValue)) {
        const strValue = rawValue.toString();
        // Check if it's a real object representation or just "[object Object]"
        if (strValue === "[object Object]") {
          // Likely an enum variant - get the first key as the variant name
          const keys = Object.keys(rawValue);
          if (keys.length === 1) {
            formattedValue = keys[0];  // Enum variant name
          } else {
            // Complex struct - convert to simple object
            formattedValue = {};
            for (const [key, val] of Object.entries(rawValue)) {
              if (typeof val === "bigint") {
                formattedValue[key] = val.toString();
              } else if (val && typeof val === "object" && val.toString) {
                const valStr = val.toString();
                formattedValue[key] = valStr === "[object Object]" ? Object.keys(val)[0] || val : valStr;
              } else {
                formattedValue[key] = val;
              }
            }
          }
        } else {
          formattedValue = strValue;
        }
      } else if (Array.isArray(rawValue)) {
        formattedValue = rawValue;
      } else {
        // Fallback for other objects
        formattedValue = rawValue;
      }
    } else {
      formattedValue = rawValue;
    }
    
    result[arg.name] = {
      type: typeStr,
      data: formattedValue,
    };
  }
  
  return result;
}

/**
 * Identify which protocol an instruction belongs to based on discriminator
 */
function identifyProtocol(discriminator: Buffer): Protocol {
  const disc = discriminator.toString("hex");
  
  const jupiterInstructions = (idl_jupiter as any).instructions || [];
  const isJupiter = jupiterInstructions.some((instr: any) => {
    const instrDisc = instr.discriminator ? Buffer.from(instr.discriminator).toString("hex") : "";
    return instrDisc === disc;
  });
  
  return isJupiter ? "jupiter" : "kamino";
}

/**
 * Decode instruction data from either Jupiter or Kamino
 * Returns generic format with type information for each field
 */
export function decodeInstruction(data: Buffer): DecodedInstruction {
  const discriminator = data.slice(0, 8);
  const protocol = identifyProtocol(discriminator);
  
  const coder = protocol === "jupiter" ? jupiterCoder : kaminoCoder;
  const idl = protocol === "jupiter" ? (idl_jupiter as any) : (idl_kamino as any);
  
  try {
    const ix = coder.instruction.decode(data) as any;
    
    if (!ix) {
      throw new Error("Failed to decode instruction");
    }
    
    const instruction = idl.instructions.find(
      (instr: any) => instr.name === ix.name
    );
    
    if (!instruction) {
      throw new Error(`Instruction ${ix.name} not found in IDL`);
    }
    
    const disc = instruction.discriminator 
      ? (`0x${Buffer.from(instruction.discriminator).toString('hex')}`)
      : '0x' + discriminator.toString('hex');
    
    // Format data with type information
    const formattedData = formatDecodedData(ix.data, instruction.args || []);
    
    return {
      name: ix.name,
      discriminator: disc,
      data: formattedData,
    };
  } catch (error) {
    throw new Error(`Failed to decode ${protocol} instruction: ${error}`);
  }
}

/**
 * Decode Jupiter Operate instruction (wrapper around generic decoder)
 * @deprecated Use decodeInstruction() instead for generic decoding
 */
export function decodeOperate(data: Buffer) {
  return decodeInstruction(data);
}
