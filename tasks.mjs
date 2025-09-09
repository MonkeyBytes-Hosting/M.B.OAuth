// tasks.mjs
import { client } from "./discord_client.mjs";
import { config } from "./config.mjs";
import { userDB } from "./db.mjs";
import { EmbedBuilder } from "discord.js";
import { logger } from "./logger.mjs";

async function sendHeartbeat() {
  try {
    const s = {
      verified: Object.keys(userDB.verifiedUsers).length,
      pending: Object.keys(userDB.pendingApprovals).length,
    };
    const uptimeString = `${Math.floor(process.uptime() / 86400)}d ${Math.floor(
      (process.uptime() % 86400) / 3600
    )}h ${Math.floor((process.uptime() % 3600) / 60)}m`;

    const guild = client.guilds.cache.get(config.guildId);
    const ch = guild?.channels.cache.get(config.heartbeatChannelId);
    if (!ch) return;

    const embed = new EmbedBuilder()
      .setTitle("💓 Royal Heartbeat")
      .addFields(
        { name: "Service", value: `🟢 Online | ${client.user.tag}`, inline: true },
        { name: "Current Uptime", value: uptimeString, inline: true },
        { name: "Verified Users", value: String(s.verified), inline: true },
        { name: "Pending Approvals", value: String(s.pending), inline: true },
        { name: "Latency", value: `${client.ws.ping}ms`, inline: true },
      )
      .setColor(config.embedColor)
      .setFooter({ text: config.embedFooter })
      .setTimestamp();

    await ch.send({ embeds: [embed] });
  } catch (e) {
    logger.error("sendHeartbeat failed", e);
  }
}

async function sendUptimeUpdate() {
  try {
    const uptime = Math.floor(process.uptime());
    const uptimeString = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;
    const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

    const guild = client.guilds.cache.get(config.guildId);
    const ch = guild?.channels.cache.get(config.uptimeLogsChannelId);
    if (!ch) return;

    const embed = new EmbedBuilder()
      .setTitle("📊 Service Performance Report")
      .addFields(
        { name: "Service Status", value: "🟢 Operational", inline: true },
        { name: "Session Runtime", value: uptimeString, inline: true },
        { name: "Memory Usage", value: `${memory} MB`, inline: true },
        { name: "Discord Latency", value: `${client.ws.ping}ms`, inline: true },
        { name: "Node Version", value: process.version, inline: true },
      )
      .setColor(config.embedColor)
      .setFooter({ text: config.embedFooter })
      .setTimestamp();

    await ch.send({ embeds: [embed] });
  } catch (e) {
    logger.error("sendUptimeUpdate failed", e);
  }
}

let hbTimer = null;
let upTimer = null;

export function startTasks() {
  if (hbTimer) clearInterval(hbTimer);
  if (upTimer) clearInterval(upTimer);
  hbTimer = setInterval(sendHeartbeat, config.heartbeatInterval);
  upTimer = setInterval(sendUptimeUpdate, config.uptimeInterval);
  // initial immediate run
  sendHeartbeat();
  sendUptimeUpdate();
}
