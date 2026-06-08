// Decide whether a loaded repository represents only a subset of its history.

/**
 * True when the loaded commits are known to be incomplete: either the clone is
 * shallow (a `.git/shallow` file exists), or the main-branch walk hit its depth
 * cap (so older history was not read).
 *
 * The `>=` is deliberate: a repo with *exactly* `cap` commits is flagged partial
 * even though it was fully loaded. For an honesty feature, over-disclosing on
 * that boundary is the safe direction, and "Load full history" is idempotent.
 */
export function historyTruncated(
  mainWalkCount: number,
  mainDepthCap: number,
  shallowExists: boolean,
): boolean {
  return shallowExists || mainWalkCount >= mainDepthCap
}
