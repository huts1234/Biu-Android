/**
 * Stand-in for `electron-log/renderer` so that the shared code in
 * `src/common` / `src/service` runs unchanged inside the mobile app.
 */
const noop = () => {};

const logger = {
  error: (...args: unknown[]) => console.error("[biu]", ...args),
  warn: (...args: unknown[]) => console.warn("[biu]", ...args),
  info: (...args: unknown[]) => console.info("[biu]", ...args),
  log: (...args: unknown[]) => console.log("[biu]", ...args),
  debug: noop,
  verbose: noop,
  silly: noop,
};

export default logger;
