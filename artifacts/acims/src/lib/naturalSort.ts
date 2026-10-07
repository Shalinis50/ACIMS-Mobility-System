/**
 * Natural sorting for bus numbers (e.g. 1, 1B, 1C, 2, 2B, 2C, 3, 3B, 3C, 4, 18, ...)
 * Ensures numerical prefixes are compared numerically, not alphabetically.
 */
export function naturalBusSort(a: string | undefined | null, b: string | undefined | null): number {
  const strA = (a || '').trim();
  const strB = (b || '').trim();

  // Extract clean bus number part if prefixed with "BUS "
  const cleanA = strA.replace(/^BUS\s+/i, '').split(/[·\s-]/)[0] || strA;
  const cleanB = strB.replace(/^BUS\s+/i, '').split(/[·\s-]/)[0] || strB;

  const matchA = cleanA.match(/^(\d+)(.*)$/);
  const matchB = cleanB.match(/^(\d+)(.*)$/);

  if (matchA && matchB) {
    const numA = parseInt(matchA[1], 10);
    const numB = parseInt(matchB[1], 10);
    if (numA !== numB) {
      return numA - numB;
    }
    return (matchA[2] || '').localeCompare(matchB[2] || '', undefined, { sensitivity: 'base' });
  }

  if (matchA && !matchB) return -1;
  if (!matchA && matchB) return 1;

  return (cleanA || '').localeCompare(cleanB || '', undefined, { numeric: true, sensitivity: 'base' });
}
