import idl_klend from "../idl/klend-enhanced-idl.json";
import idl_jupiter from "../idl/liquidity.json";

function get_idl_info(idl: any) {
    if (idl === idl_jupiter) {
        console.log(
    `\n` +
    `Quick Sum:\n\n` +
    `name: ${idl_jupiter.metadata.name}\n` +
    `Address: ${idl_jupiter.address}\n` +
    `Version: ${idl_jupiter.metadata.version}\n` +
    `Instructions: ${idl_jupiter.instructions.length}\n` +
    `Accounts: ${idl_jupiter.accounts.length}\n` +
    `Types: ${idl_jupiter.types.length}\n` +
    `Events: ${idl_jupiter.events ? idl_jupiter.events.length : 0}\n`
        );
        
    console.log("Instruction names:");
    idl_jupiter.instructions.forEach(o => console.log(o.name))
    console.log("");
        
    } else if (idl === idl_klend) {
        console.log(
    `\nname: ${idl_klend.metadata.name}\n` +
    `Address: ${idl_klend.address}\n` +
    `Version: ${idl_klend.metadata.version}\n` +
    `Instructions: ${idl_klend.instructions.length}\n` +
    `Accounts: ${idl_klend.accounts.length}\n` +
    `Types: ${idl_klend.types.length}\n` +
    `Events: ${idl_klend.events ? idl_klend.events.length : 0}\n` +
    `\nInstruction names:`
        );
        idl_klend.instructions.forEach(o => console.log(o.name));
        console.log("");
    }
}


// from root: npx ts-node src/idl_info.ts
get_idl_info(idl_jupiter);
get_idl_info(idl_klend);
