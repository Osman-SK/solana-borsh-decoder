import { toPrettyJson } from '../src/json-utils';

console.log(toPrettyJson({ amount: 1000000000n, negative: -500n }));