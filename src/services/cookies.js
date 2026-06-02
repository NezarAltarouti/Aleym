// ---------------------------------------------------------------------------
// cookies.js — tiny cookie helpers
// ---------------------------------------------------------------------------
// Small, dependency-free wrappers around document.cookie. Values are
// URI-encoded so they're safe to store/read.

/**
 * Write a cookie.
 * @param {string} name
 * @param {string} value
 * @param {number} [days=365] expiry in days
 */
export function setCookie(name, value, days = 365) {
  const maxAge = Math.floor(days * 24 * 60 * 60); // seconds
  document.cookie =
    `${encodeURIComponent(name)}=${encodeURIComponent(value)};` +
    ` path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Read a cookie. Returns null if not present.
 * @param {string} name
 * @returns {string | null}
 */
export function getCookie(name) {
  const target = encodeURIComponent(name) + "=";
  const parts = document.cookie ? document.cookie.split("; ") : [];
  for (const part of parts) {
    if (part.startsWith(target)) {
      return decodeURIComponent(part.slice(target.length));
    }
  }
  return null;
}

/**
 * Remove a cookie.
 * @param {string} name
 */
export function deleteCookie(name) {
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Lax`;
}

// Key used by the onboarding tutorial popup. When set to "1" the tour will
// not auto-open on app launch.
export const TUTORIAL_COOKIE = "alyem_tutorial_dismissed";
