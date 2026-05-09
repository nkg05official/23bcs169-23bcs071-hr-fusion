/**
 * utils/logger.js
 * Centralized logging utility for the HR module.
 *
 * In development, logs go to the console.
 * In production (NODE_ENV=production), all output is suppressed
 * so no debug information leaks to end users.
 */

const isDev = import.meta.env?.MODE !== "production" && process.env.NODE_ENV !== "production";

const logger = {
  /**
   * Log an informational message (replaces console.log).
   * Silenced in production.
   */
  info: (...args) => {
    if (isDev) console.info("[HR]", ...args); // eslint-disable-line no-console
  },

  /**
   * Log a warning (replaces console.warn).
   * Silenced in production.
   */
  warn: (...args) => {
    if (isDev) console.warn("[HR]", ...args); // eslint-disable-line no-console
  },

  /**
   * Log an error. Always active so runtime errors are visible during
   * development. In production the message is kept brief and never
   * exposes stack traces to the UI.
   */
  error: (message, err) => {
    if (isDev) {
      console.error("[HR ERROR]", message, err); // eslint-disable-line no-console
    }
    // In production, errors are handled by the UI (toast notifications)
    // and should NOT be console.error'd — keep the surface clean.
  },
};

export default logger;
