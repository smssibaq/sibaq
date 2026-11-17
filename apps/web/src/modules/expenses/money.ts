/** Parse decimal rupees without multiplying a floating point value. */
export function toPaise(rupees: string | number): number {
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(String(rupees).trim());
  if (!match) throw new Error('Enter a non-negative amount with up to two decimal places.');
  const paise = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(paise)) throw new Error('Amount is too large.');
  return paise;
}
export function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
}
export function splitEqually(totalPaise: number, n: number): number[] {
  if (!Number.isSafeInteger(totalPaise) || totalPaise < 0 || !Number.isSafeInteger(n) || n < 0) {
    throw new Error('Invalid split amount or player count.');
  }
  if (!n) return [];
  const each = Math.floor(totalPaise / n);
  return Array.from({ length: n }, (_, i) => each + (i < totalPaise % n ? 1 : 0));
}
export function toRupees(paise: number): number { return Number((paise / 100).toFixed(2)); }
