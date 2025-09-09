// logger.mjs
export const logger = {
  info: (m, e) => console.log(`[INFO] ${m}`, e ?? ""),
  warn: (m, e) => console.log(`[WARN] ${m}`, e ?? ""),
  error: (m, e) => console.log(`[ERROR] ${m}`, e ?? ""),
  success: (m, e) => console.log(`[SUCCESS] ${m}`, e ?? ""),
  startup: (m, e) => console.log(`[STARTUP] ${m}`, e ?? ""),
};
