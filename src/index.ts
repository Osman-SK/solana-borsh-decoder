import { Command } from 'commander';
import * as fs from 'fs';
import bs58 from 'bs58';
import { decodeOperate } from './decoder';
//import { toPrettyJson } from './json-utils';

const program = new Command();

program
  .name('jlend-operate-decoder')
  .description('Decode JLend Liquidity Operate ix')
  .version('0.1.0')
  .option('-f, --format <type>', 'force format: base58, base64, or hex', 'auto')  // Auto-detect
  .argument('<input>', 'instruction data (base58/base64/hex string) or file path')
  .action((input: string, options: { format: 'auto' | 'base58' | 'base64' | 'hex' }) => {
    let buffer: Buffer;

    if (fs.existsSync(input)) {
      // File input – assume raw bytes or text
      buffer = fs.readFileSync(input);
    } else {
      // String input – detect or force format
      let str = input.trim();

      let format: 'hex' | 'base58' | 'base64';
      
      if (options.format !== 'auto') {
        format = options.format;
      } else {
        // Auto-detect logic
        // Check if it starts with 0x and the rest is valid hex
        if (str.match(/^0x/i)) {
          const withoutPrefix = str.substring(2);
          if (/^[0-9a-fA-F]+$/.test(withoutPrefix)) {
            format = 'hex';
          } else if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(withoutPrefix)) {
            // Starts with 0x but content after is base58
            format = 'base58';
          } else {
            // Starts with 0x but not valid hex or base58
            format = 'base64';
          }
        } else if (str.match(/^[1-9A-HJ-NP-Za-km-z]+$/)) {
          // Pure base58 (no 0x prefix, valid base58 chars)
          format = 'base58';
        } else {
          // Default to base64
          format = 'base64';
        }
      }

        //(str.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(str) ? 'base64' : 'base58'))
        
        if (format === 'hex') {
        console.log('decoded from hex');
        str = str.replace(/^0x/i, '');  // Strip prefix
        buffer = Buffer.from(str, 'hex');
      } else if (format === 'base64') {
        console.log('decoded from base64');
        buffer = Buffer.from(str, 'base64');
      } else if (format === 'base58') {
        console.log('decoded from base58');
        // Remove 0x prefix if present (for base58 that was misidentified as hex)
        str = str.replace(/^0x/i, '');
        buffer = Buffer.from(bs58.decode(str));
      } else {
        console.error('Unsupported format');
        process.exit(1);
      }
    }

    try {
      const decoded = decodeOperate(buffer);
      
      //console.log((decoded));
      console.log(JSON.stringify(decoded, this, 1));
      //console.log(toPrettyJson(decoded.supply_amount));
    } catch (err) {
      console.error('Decode failed (wrong format/schema/tx?):', (err as Error).message);
      process.exit(1);
    }
  });

program.parse();

// npm run build && npm run start -- "0xd96ad06374972a870000000000000000000000000000000000028393fbffffffffffffffffffffff65f5dffd7c84af75a8a5f7bdcea1622e2b3abf87fc53a871b908561a3a8b1bde65f5dffd7c84af75a8a5f7bdcea1622e2b3abf87fc53a871b908561a3a8b1bde01"
// tsc && npm run start "0xd96ad06374972a87091f587b0b00000000000000000000000000000000000000000000000000000065f5dffd7c84af75a8a5f7bdcea1622e2b3abf87fc53a871b908561a3a8b1bde65f5dffd7c84af75a8a5f7bdcea1622e2b3abf87fc53a871b908561a3a8b1bde01"
// tsc && npm run start -- --format base58 5D3nYNAt6SawdSoxehjqbtF4Zox4KCbtkNFGs43ngsfMCjEozLwKJKtoikXvwGY6fiSHfLvKWUFSF3FBCXH2f2uaj7hXMhVRXaw9umNqKkgzak3y6rXnbWty3zehPKJKuxZ6T1SAByxHnHBN
// tsc && node dist/index.js --format base58 5D3nYNAt6SarqCNC9CBxPpgnVF1yKLxeoxvnyjfDfKDRcNcapomx75qobsg3qcR3GC6jxovP2NkaQm3BfzSgsTjPnMDgcfqq2njBHWN8w7uyCMFq3RLHD9pvcYpkW9yxkiQbk2teQGxNEaBa