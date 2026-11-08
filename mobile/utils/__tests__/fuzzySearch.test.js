import { fuzzyFilter, fuzzyMatch } from '../fuzzySearch';

describe('fuzzyMatch', () => {
  it.each([null, undefined, '', '   '])('treats an empty query (%s) as a match', (query) => {
    expect(fuzzyMatch(query, 'James Rivera')).toBe(true);
  });

  it('normalizes casing and surrounding whitespace for substring matches', () => {
    expect(fuzzyMatch('  RIV  ', 'James Rivera')).toBe(true);
  });

  it.each([null, undefined, '', '   '])('does not match a non-empty query against an empty target (%s)', (target) => {
    expect(fuzzyMatch('james', target)).toBe(false);
  });

  it('supports in-order subsequence matches', () => {
    expect(fuzzyMatch('jms', 'James Rivera')).toBe(true);
  });

  it('allows one edit for queries of four characters or fewer', () => {
    expect(fuzzyMatch('joan', 'John Smith')).toBe(true);
    expect(fuzzyMatch('zzzz', 'John Smith')).toBe(false);
  });

  it('allows two edits for longer queries and compares individual words', () => {
    expect(fuzzyMatch('jmaes', 'Professor James Rivera')).toBe(true);
    expect(fuzzyMatch('completely-different', 'James Rivera')).toBe(false);
  });
});

describe('fuzzyFilter', () => {
  const members = [
    { id: 1, firstName: 'James', lastName: 'Rivera', email: 'james@example.com' },
    { id: 2, firstName: 'Priya', lastName: 'Shah', email: 'priya@example.com' },
  ];
  const fields = (member) => [member.firstName, member.lastName, member.email];

  it.each([null, undefined, '', '   '])('returns the original array for an empty query (%s)', (query) => {
    expect(fuzzyFilter(members, query, fields)).toBe(members);
  });

  it('matches any supplied field without mutating the source array', () => {
    const result = fuzzyFilter(members, 'prya', fields);

    expect(result).toEqual([members[1]]);
    expect(members).toHaveLength(2);
  });

  it('returns an empty array when no field matches', () => {
    expect(fuzzyFilter(members, 'nobody', fields)).toEqual([]);
  });
});
