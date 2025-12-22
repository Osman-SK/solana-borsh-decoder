"use strict";
const mockBlockchainData = {
    signature: "OSK...examplebase58",
    amount: 1000000000n, //1 sol in lamports
    fee: 5000
};
function parseTx(data) {
    //if (typeof data.amount !== 'string') throw new Error('Invalid amount');
    return {
        signature: data.signature,
        amount: BigInt(data.amount), //safe conversion
        fee: data.fee
    };
}
console.log(parseTx(mockBlockchainData));
