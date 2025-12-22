interface MockTx {
    signature: string;
    amount: bigint;
    fee: number;
};

const mockBlockchainData: MockTx = {
    signature: "OSK...examplebase58",
    amount: 1_000_000_000n, //1 sol in lamports
    fee: 5000
};

function parseTx(data: any): MockTx { // 'any' to simulate raw JSON
    //if (typeof data.amount !== 'string') throw new Error('Invalid amount');
    return {
        signature: data.signature,
        amount: BigInt(data.amount), //safe conversion
        fee: data.fee
    };
};

console.log(parseTx(mockBlockchainData));