import { Command } from 'commander';
import * as fs from 'fs';
import bs58 from 'bs58';
import { decodeOperate } from './decoder';
import { toPrettyJson } from './json-utils';

const program = new Command();

program
  .name('jlend-operate-decoder')
  .description('Decode JLend Liquidity Operate ix')
  .version('0.1.0')
  .argument('<input>', 'instruction data (base58/base64/hex string) or file path')
  .option('-f, --format <type>', 'force format: base58, base64, or hex', 'auto')  // Auto-detect
  .action((input: string, options: { format: 'auto' | 'base58' | 'base64' | 'hex' }) => {
    let buffer: Buffer;

    if (fs.existsSync(input)) {
      // File input – assume raw bytes or text
      buffer = fs.readFileSync(input);
    } else {
      // String input – detect or force format
      let str = input.trim();

      const format = options.format === 'auto'
        ? (str.startsWith('0x') ? 'hex' : (str.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(str) ? 'base64' : 'base58'))
        : options.format;

      if (format === 'hex') {
        str = str.replace(/^0x/i, '');  // Strip prefix
        if (!/^[0-9a-fA-F]+$/.test(str)) {
          console.error('Invalid hex string');
          process.exit(1);
        }
        buffer = Buffer.from(str, 'hex');
      } else if (format === 'base64') {
        buffer = Buffer.from(str, 'base64');
      } else if (format === 'base58') {
        buffer = Buffer.from(bs58.decode(str));
      } else {
        console.error('Unsupported format');
        process.exit(1);
      }
    }

    try {
      const decoded = decodeOperate(buffer);
      console.log(toPrettyJson(decoded));
    } catch (err) {
      console.error('Decode failed (wrong format/schema/tx?):', (err as Error).message);
      process.exit(1);
    }
  });

program.parse();