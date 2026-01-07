"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const json_utils_1 = require("../src/json-utils");
console.log((0, json_utils_1.toPrettyJson)({ amount: 1000000000n, negative: -500n }));
