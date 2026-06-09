/**
 * Next index when stepping through a wrap-around list of search matches.
 *
 * @param current the current index, or -1 when nothing is selected yet
 * @param dir     +1 for next, -1 for previous
 * @param count   number of matches
 * @returns the next index, or -1 when there are no matches
 */
export function nextMatchIndex(current: number, dir: 1 | -1, count: number): number {
  if (count <= 0) return -1
  // From "nothing selected", forward → first match, backward → last match
  // (without this, the modulo would skip the last match on a first back-step).
  if (current < 0) return dir === 1 ? 0 : count - 1
  return (current + dir + count) % count
}
