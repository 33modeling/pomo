/** Stable unique id generator (uses crypto.randomUUID when available). */
export function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return (
    'id-' +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36)
  )
}
