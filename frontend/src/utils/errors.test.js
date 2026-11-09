import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  it('returns API response message when available', () => {
    expect(getErrorMessage({ response: { data: { message: 'Bad request' } } }, 'Fallback')).toBe('Bad request');
  });

  it('returns generic error message when API payload is absent', () => {
    expect(getErrorMessage({ message: 'Network down' }, 'Fallback')).toBe('Network down');
  });

  it('returns fallback when no message details exist', () => {
    expect(getErrorMessage({}, 'Fallback')).toBe('Fallback');
  });
});
