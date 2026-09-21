/**
 * Better Auth cookie configuration constants
 * Keep in sync with lib/auth.ts advanced.cookiePrefix
 */

export const COOKIE_PREFIX = 'resume-copilot';

export const COOKIE_NAMES = {
  SESSION_TOKEN: `${COOKIE_PREFIX}.session_token`,
  SESSION_DATA: `${COOKIE_PREFIX}.session_data`,
  DONT_REMEMBER: `${COOKIE_PREFIX}.dont_remember`,
} as const;

export const getCookieName = (type: keyof typeof COOKIE_NAMES) => COOKIE_NAMES[type];
