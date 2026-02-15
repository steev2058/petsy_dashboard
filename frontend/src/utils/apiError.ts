export type ToastableError = any;

export function getApiErrorCode(error: ToastableError): string {
  const data = error?.response?.data;
  const detail = data?.detail;
  if (detail && typeof detail === 'object' && typeof detail.code === 'string') return detail.code;
  return '';
}

export function getApiErrorTranslationKey(code: string): string | null {
  switch (code) {
    case 'AUTH_EMAIL_EXISTS':
      return 'err_auth_email_exists';
    case 'AUTH_INVALID_CREDENTIALS':
      return 'err_auth_invalid_credentials';
    case 'AUTH_NOT_VERIFIED':
      return 'err_auth_not_verified';
    case 'AUTH_USER_NOT_FOUND':
      return 'err_auth_user_not_found';
    case 'AUTH_INVALID_VERIFICATION_CODE':
      return 'err_auth_invalid_verification_code';
    case 'AUTH_RESET_NOT_REQUESTED':
      return 'err_auth_reset_not_requested';
    case 'AUTH_INVALID_RESET_CODE':
      return 'err_auth_invalid_reset_code';
    case 'AUTH_RESET_CODE_EXPIRED':
      return 'err_auth_reset_code_expired';
    default:
      return null;
  }
}

export function getApiErrorMessage(
  error: ToastableError,
  fallback = 'Something went wrong. Please try again.',
  t?: (key: string) => string,
) {
  // Axios-style errors
  const hasResponse = !!error?.response;
  if (!hasResponse) {
    // Network error / CORS / offline
    return 'Unable to reach server. Please check your connection and try again.';
  }

  const status = error?.response?.status;
  const data = error?.response?.data;

  // New standard: { detail: { code, message } }
  const detailObj = data?.detail;
  if (detailObj && typeof detailObj === 'object') {
    const code = typeof detailObj.code === 'string' ? detailObj.code : '';
    const msg = typeof detailObj.message === 'string' ? detailObj.message : '';

    if (code && t) {
      const key = getApiErrorTranslationKey(code);
      if (key) {
        const translated = t(key);
        // If translation missing, many i18n libs echo the key back; treat that as missing.
        if (translated && translated !== key) return translated;
      }
    }

    if (msg) return msg;
  }

  // Legacy: FastAPI detail string
  const detail = typeof data?.detail === 'string' ? data.detail : '';
  if (detail) return detail;

  // Some endpoints may return { message: string }
  const message = typeof data?.message === 'string' ? data.message : '';
  if (message) return message;

  if (status === 401) return 'Email or password is not correct';
  if (status === 403) return 'Access denied';

  return fallback;
}
