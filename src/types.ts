import {Address} from '@solana/kit';

export enum TransferType {
    SKIP = 0,
    DIRECT = 1,
    CLAIM = 2
}

export interface DecodedOperate {
    supplyAmount: bigint;
    borrowAmount: bigint;
    withdrawTo: Address;
    borrowTo: Address;
    transferType: TransferType;
}