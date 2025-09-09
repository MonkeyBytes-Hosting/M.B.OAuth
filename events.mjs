// events.mjs
import { client } from "./discord_client.mjs";
import { logger } from "./logger.mjs";
import { config } from "./config.mjs";
import { createVerificationMessage, syncDatabaseWithRoles } from "./utils.mjs";
import { userDB, saveDB } from "./db.mjs";
import { EmbedBuilder, ActivityType } from "discord.js";
import { startTasks } from "./tasks.mjs";

client.once("ready", async () => {
  logger.startup(`Authentication service online: ${client.user.tag}`);

  try {
    client.user.setPresence({
      activities: [{ name: "🔐 Managing Royal Seals", type: ActivityType.Watching }],
      status: "online",
    });
  } catch {}

  const guild = client.guilds.cache.get(config.guildId);
  if (!guild) {
    logger.error(`Guild ${config.guildId} not found`);
    return;
  }

  // Register slash commands quickly at guild scope (best for dev iteration).
  const { registerCommands } = await import("./commands.mjs");
  await registerCommands(guild); // shows up near-instantly vs global. :contentReference[oaicite:2]{index=2}

  // Ensure/update the verification message in your verification channel
  try {
    const vCh = guild.channels.cache.get(config.verificationChannelId);
    if (vCh) {
      const msgs = await vCh.messages.fetch({ limit: 10 }).catch(() => null);
      const existing = msgs?.find(
        (m) => m.author.id === client.user.id && m.embeds[0]?.title?.includes("Verification")
      );
      if (existing) await existing.delete().catch(() => {});
      await createVerificationMessage(vCh);
    }
  } catch (e) {
    logger.error("verification message update failed", e);
  }

  // Initial role↔DB reconciliation + schedule background tasks
  await syncDatabaseWithRoles();
  startTasks();
});

// DM a nudge on join
client.on("guildMemberAdd", async (member) => {
  try {
    await member.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("👋 Welcome to MonkeyBytes")
          .setDescription(
            "To gain access, please verify:\n• Use `/verify` in the server\n• Or press the **verification button** in the verification channel."
          )
          .setColor(config.embedColor)
          .setFooter({ text: config.embedFooter })
          .setTimestamp(),
      ],
    }).catch(() => {});
  } catch {}
});

// Auto-revoke on leave + log
client.on("guildMemberRemove", async (member) => {
  try {
    const userId = member.id;
    const guild = client.guilds.cache.get(config.guildId);
    const logCh = guild?.channels.cache.get(config.logChannelId);

    if (userDB.verifiedUsers?.[userId]) {
      const data = { ...userDB.verifiedUsers[userId] };
      delete userDB.verifiedUsers[userId];

      userDB.deauthorizedUsers[userId] = {
        ...data,
        deauthorizedAt: new Date().toISOString(),
        deauthorizedBy: "system",
        deauthorizationReason: "User left the server",
      };
      userDB.statistics.totalDeauths++;
      saveDB();

      if (logCh) {
        const e = new EmbedBuilder()
          .setTitle("👋 Verified Member Departed")
          .setDescription(`<@${userId}> has left the realm`)
          .addFields(
            { name: "User ID", value: userId, inline: true },
            { name: "Status Change", value: "Royal seal automatically revoked", inline: true }
          )
          .setColor("#FF9B21")
          .setFooter({ text: config.embedFooter })
          .setTimestamp();
        await logCh.send({ embeds: [e] }).catch(() => {});
      }
    }
  } catch (e) {
    logger.error("guildMemberRemove error", e);
  }
});
