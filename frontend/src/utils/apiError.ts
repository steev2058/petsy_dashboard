export type ToastableError = any;

export function getApiErrorMessage(error: ToastableError, fallback = 'Something went wrong. Please try again.') {
  // Axios-style errors
  const hasResponse = !!error?.response;
  if (!hasResponse) {
    // Network error / CORS / offline
    return 'Unable to reach server. Please check your connection and try again.';
  }

  const status = error?.response?.status;
  const data = error?.response?.data;

  // FastAPI typically uses { detail: string }
  const detail = typeof data?.detail === 'string' ? data.detail : '';
  if (detail) return detail;

  // Some endpoints may return { message: string }
  const message = typeof data?.message === 'string' ? data.message : '';
  if (message) return message;

  if (status === 401) return 'Email or password is not correct';
  if (status === 403) return 'Access denied';

  return fallback;
}
