// bot.mjs — your app’s ignition switch
import { client } from "./discord_client.mjs";
import { logger } from "./logger.mjs";
import { config } from "./config.mjs";
import { loadDB } from "./db.mjs";
import { startExpress } from "./express.mjs";
import "./interactions.mjs";  // sets up command & button handling
import "./events.mjs";        // sets up ready, join, leave, etc.

loadDB();
startExpress();

if (!config.token) {
  logger.error("Missing DISCORD_BOT_TOKEN in configuration");
  process.exit(1);
}

client.login(config.token).catch((e) => {
  logger.error("Discord login failed", e);
  process.exit(1);
});
