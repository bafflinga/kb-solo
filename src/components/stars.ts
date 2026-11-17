export function starGlyphs(count: number): string {
  const filled = Math.max(0, Math.min(3, Math.floor(count)))
  return '★'.repeat(filled) + '☆'.repeat(3 - filled)
}
