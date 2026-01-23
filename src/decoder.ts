import * as borsh from '@coral-xyz/borsh';
import { Address } from '@solana/kit';
import { DecodedOperate, TransferType } from './types';

const OperateSchema = borsh.struct([
  // Replace i128 with raw bytes, parse manually
  borsh.array(borsh.u8(), 16, 'supplyAmountBytes'), //borsh.array(innerType, length, fieldName)
  borsh.array(borsh.u8(), 16, 'borrowAmountBytes'),
  borsh.publicKey('withdrawTo'),
  borsh.publicKey('borrowTo'),
  borsh.u8('transferType'),
]);

export function decodeOperate(data: Buffer): DecodedOperate {
  const raw = OperateSchema.decode(data.subarray(8)); //decode(b, offset)

  return {
    supplyAmount: parseI128(Uint8Array.from(raw.supplyAmountBytes)),
    borrowAmount: parseI128(Uint8Array.from(raw.borrowAmountBytes)),
    withdrawTo: raw.withdrawTo.toBase58() as Address,
    borrowTo: raw.borrowTo.toBase58() as Address,
    transferType: raw.transferType as TransferType
  };
}

// Manual signed i128 from little-endian bytes (16 bytes)
function parseI128(leBytes: Uint8Array): bigint {
  if (leBytes.length !== 16) throw new Error('i128 requires exactly 16 bytes');

  let value = 0n;
  for (let i = 0; i < 16; i++) {
    value += BigInt(leBytes[i]) << BigInt(8 * i);
  }

  // Sign extend if high bit set
  if (leBytes[15] & 0x80) {
    value -= 2n ** 128n;
  }

  return value;
}