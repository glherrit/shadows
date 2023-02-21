export const ensureNumber = (value: string | number) =>
  typeof value === 'string' ? parseFloat(value) : value
