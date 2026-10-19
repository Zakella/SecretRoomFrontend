/** Display order of known sizes (lower-case). Unknown sizes go after them. */
export const SIZE_ORDER: string[] = [
  'xxs', 'xs', 'xs/s', 's', 's/m', 'm', 'm/l', 'l', 'l/xl', 'xl', 'xl/xxl', 'xxl', '2xl', '3xl', '4xl', '5xl',
  'one size', 'one-size',
  '70a', '70b', '70c', '70d', '75a', '75b', '75c', '75d',
  '80a', '80b', '80c', '80d', '85a', '85b', '85c', '85d',
];

export function compareSizes(a?: string, b?: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const idxA = SIZE_ORDER.indexOf(a.toLowerCase());
  const idxB = SIZE_ORDER.indexOf(b.toLowerCase());
  if (idxA === -1 && idxB === -1) return a.localeCompare(b, undefined, {numeric: true});
  if (idxA === -1) return 1;
  if (idxB === -1) return -1;
  return idxA - idxB;
}
