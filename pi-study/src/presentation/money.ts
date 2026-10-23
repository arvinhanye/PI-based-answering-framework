import { toNano } from '../budget/ledger.js';
/** Display only: preserve nano-CNY precision in the ledger and JSON exports. */
export function formatMoney(value: string): string {
    const amount = toNano(value);
    if (amount > 0n && amount < 10000000n) return '<0.01';
    const cents = (amount + 5000000n) / 10000000n;
    return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}
