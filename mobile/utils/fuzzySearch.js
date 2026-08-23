/**
 * Lightweight, dependency-free fuzzy text matching for client-side list filtering
 * (e.g. searching member lists by name). No network/backend involvement.
 */

/** Levenshtein edit distance between two strings. */
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

/**
 * Returns true if `query` fuzzily matches `target`. An empty query always matches.
 * Match strategies (any one is sufficient):
 *  1. Substring containment (fast path for typical partial-name searches).
 *  2. In-order subsequence match — tolerates missing/extra characters
 *     (e.g. "jms" matches "James").
 *  3. Per-word edit-distance match — tolerates misspellings/typos
 *     (e.g. "jmaes" matches "James").
 */
export function fuzzyMatch(query, target) {
  const q = (query ?? '').toLowerCase().trim();
  if (!q) return true;
  const t = (target ?? '').toLowerCase().trim();
  if (!t) return false;

  if (t.includes(q)) return true;

  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  if (qi === q.length) return true;

  const maxDistance = q.length <= 4 ? 1 : 2;
  return t.split(/\s+/).some((word) => levenshteinDistance(q, word) <= maxDistance);
}

/**
 * Filters `items` down to those where `query` fuzzily matches at least one of the
 * text fields returned by `getFields(item)`. Returns `items` unchanged if `query` is blank.
 */
export function fuzzyFilter(items, query, getFields) {
  const q = (query ?? '').trim();
  if (!q) return items;
  return items.filter((item) => getFields(item).some((field) => fuzzyMatch(q, field)));
}
