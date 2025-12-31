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
node dist/cli.js "<base64-instruction>" --format base64