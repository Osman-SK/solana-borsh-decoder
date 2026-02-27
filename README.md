# solana-borsh-decoder

Type-safe Borsh decoder for Solana program instructions (focused on lending protocols like Jupiter Lend)

## About

This tool will:

Accept input
Decode using Borsh schemas
Output pretty JSON (with safe bigint/PublicKey handling)

## Quick Start
```bash
npm install
npm run build
npm run start -- "<operate-ix-data>"
```

eg. 

npm run build && npm run start -- "0xd96ad06374972a870000000000000000000000000000000000028393fbffffffffffffffffffffff65f5dffd7c84af75a8a5f7bdcea1622e2b3abf87fc53a871b908561a3a8b1bde65f5dffd7c84af75a8a5f7bdcea1622e2b3abf87fc53a871b908561a3a8b1bde01"

npm run build && npm run start -- --format base58 5D3nYNAt6SawdSoxehjqbtF4Zox4KCbtkNFGs43ngsfMCjEozLwKJKtoikXvwGY6fiSHfLvKWUFSF3FBCXH2f2uaj7hXMhVRXaw9umNqKkgzak3y6rXnbWty3zehPKJKuxZ6T1SAByxHnHBN

