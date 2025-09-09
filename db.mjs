// db.mjs
import fs from 'fs';
import path from 'path';
import { logger } from './logger.mjs';
import { config } from './config.mjs';

export let userDB = {
  pendingApprovals: {},
  verifiedUsers: {},
  deauthorizedUsers: {},
  statistics: { totalVerified: 0, verificationsByDay: {}, totalDeauths: 0 },
};

function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  if (dir && dir !== "." && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function saveDB() {
  try {
    ensureDirFor(config.dbPath);
    fs.writeFileSync(config.dbPath, JSON.stringify(userDB, null, 2));
  } catch (e) {
    logger.error("Failed to save DB", e);
  }
}

export function loadDB() {
  try {
    if (fs.existsSync(config.dbPath)) {
      const raw = fs.readFileSync(config.dbPath, "utf8");
      if (raw.trim()) userDB = { ...userDB, ...JSON.parse(raw) };
    } else { saveDB(); }
  } catch (e) {
    logger.error("Failed to load DB", e);
    saveDB();
  }
}
