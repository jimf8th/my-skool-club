import {
  getFriendlyErrorMessage,
  NETWORK_MESSAGE,
  SERVER_MESSAGE,
} from '../errors';

describe('getFriendlyErrorMessage', () => {
  it('uses the specific friendly message for an incorrect deletion password', () => {
    expect(getFriendlyErrorMessage({
      response: { status: 403, data: { message: 'Password is incorrect' } },
      config: { method: 'DELETE', url: '/account' },
    }, 'Could not delete account.')).toBe('Password is incorrect. Please try again.');
  });

  it('preserves concise client validation messages', () => {
    expect(getFriendlyErrorMessage({
      response: { status: 409, data: { message: 'Email already exists' } },
    }, 'Registration failed')).toBe('Email already exists');
  });

  it.each([
    [{ request: {}, message: 'Network Error' }, NETWORK_MESSAGE],
    [{ code: 'ERR_NETWORK' }, NETWORK_MESSAGE],
    [{ response: { status: 503, data: { message: 'Database unavailable' } } }, SERVER_MESSAGE],
  ])('replaces infrastructure failures with a safe message', (error, expected) => {
    expect(getFriendlyErrorMessage(error)).toBe(expected);
  });

  it.each([
    'java.lang.IllegalStateException\n at service.AccountService',
    '<html>Proxy error</html>',
    'SQL constraint account_fk failed',
    'x'.repeat(201),
  ])('does not expose unsafe server text', (message) => {
    const error = { response: { status: 400, data: { message } } };
    expect(getFriendlyErrorMessage(error, 'Please check your information.')).toBe(
      'Please check your information.'
    );
  });

  it('uses the supplied fallback for setup and malformed failures', () => {
    expect(getFriendlyErrorMessage(new Error('internal'), 'Action failed.')).toBe('Action failed.');
  });
});
