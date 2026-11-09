import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  it('prefers the server-provided message when available', () => {
    const error = {
      response: { data: { message: 'The request could not be processed.' } },
      message: 'Fallback message',
    };

    expect(getErrorMessage(error, 'Something went wrong. Please try again.')).toBe(
      'The request could not be processed.'
    );
  });

  it('falls back to the thrown error message when no server payload exists', () => {
    const error = { message: 'Network request failed.' };

    expect(getErrorMessage(error, 'Something went wrong. Please try again.')).toBe(
      'Network request failed.'
    );
  });

  it('returns the supplied fallback when no error details are present', () => {
    expect(getErrorMessage(undefined, 'Something went wrong. Please try again.')).toBe(
      'Something went wrong. Please try again.'
    );
  });
});
