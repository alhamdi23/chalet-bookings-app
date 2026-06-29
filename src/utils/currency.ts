const OMR_FORMATTER = new Intl.NumberFormat('en-OM', {
  style: 'currency',
  currency: 'OMR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a number as Omani Rial (OMR) with 2 decimal places. */
export function formatOmr(amount: number): string {
  if (!Number.isFinite(amount)) {
    return OMR_FORMATTER.format(0);
  }
  return OMR_FORMATTER.format(amount);
}

/** Parse a user-entered string into a number, returning 0 for invalid input. */
export function parseAmount(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
