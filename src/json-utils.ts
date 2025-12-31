
export function blockchainReplacer(_key: string, value: any): any {
  if (typeof value === 'bigint') {
    return value.toString();  // Handles signed i128 (positive/negative supply/borrow)
  }
  // Addresses are already strings – no special handling!
  return value;
}

export function toPrettyJson(obj: any): string {
    return JSON.stringify(obj, blockchainReplacer, 2);
}