const NETWORK_MESSAGE = 'Unable to connect. Check your internet connection and try again.';
const SERVER_MESSAGE = 'The service is temporarily unavailable. Please try again shortly.';

function isSafeClientMessage(message) {
  if (typeof message !== 'string') return false;
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 200 || /[\r\n]/.test(trimmed)) return false;
  return !/(exception|stack trace|sql|org\.springframework|java\.|<html)/i.test(trimmed);
}

/**
 * Converts transport/server failures into text that is safe to render in the
 * application. Expected 4xx validation messages are retained; internal 5xx,
 * network, stack-trace, and malformed responses are replaced.
 */
export function getFriendlyErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;
  const method = error?.config?.method?.toLowerCase();
  const url = error?.config?.url;

  if (!error?.response && (error?.request || error?.code === 'ERR_NETWORK')) {
    return NETWORK_MESSAGE;
  }
  if (status >= 500) return SERVER_MESSAGE;
  if (status === 403 && method === 'delete' && url === '/account') {
    return 'Password is incorrect. Please try again.';
  }
  if ((status == null || (status >= 400 && status < 500)) && isSafeClientMessage(serverMessage)) {
    return serverMessage.trim();
  }
  return fallback;
}

export { NETWORK_MESSAGE, SERVER_MESSAGE };
