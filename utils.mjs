// utils.mjs
import {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  PermissionsBitField,
} from "discord.js";
import { client } from "./discord_client.mjs";
import { config } from "./config.mjs";
import { userDB, saveDB } from "./db.mjs";
import { logger } from "./logger.mjs";

// ---------- perms ----------
export function isAdmin(member) {
  return (
    member?.roles?.cache?.has(config.adminRoleId) ||
    member?.permissions?.has(PermissionsBitField.Flags.Administrator)
  );
}

// ---------- staff approval UX ----------
export async function sendVerificationRequest(userId, username) {
  try {
    const guild = client.guilds.cache.get(config.guildId);
    const ch = guild?.channels.cache.get(config.approvalChannelId);
    if (!guild || !ch) return false;

    const approve = new ButtonBuilder()
      .setCustomId(`approve_${userId}`)
      .setLabel("✅ Grant Royal Seal")
      .setStyle(ButtonStyle.Success);
    const deny = new ButtonBuilder()
      .setCustomId(`deny_${userId}`)
      .setLabel("❌ Deny Request")
      .setStyle(ButtonStyle.Danger);

    const embed = new EmbedBuilder()
      .setTitle("📜 Royal Seal Request")
      .setDescription(`<@${userId}> (${username}) requests entry to the royal court.`)
      .addFields(
        { name: "Noble ID", value: userId, inline: true },
        { name: "Time", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
      )
      .setColor(config.embedColor)
      .setFooter({ text: config.embedFooter })
      .setTimestamp();

    await ch.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(approve, deny)],
    });
    return true;
  } catch (e) {
    logger.error("sendVerificationRequest failed", e);
    return false;
  }
}

export async function processVerificationApproval(userId, approved, staffId, denyReason = "Denied by staff") {
  const guild = client.guilds.cache.get(config.guildId);
  if (!guild) return false;
  const pending = userDB.pendingApprovals[userId];

  try {
    if (approved) {
      if (pending) delete userDB.pendingApprovals[userId];

      // Try OAuth guilds.join if we have accessToken; else repair role only
      let member = null;
      if (pending?.accessToken) {
        member = await guild.members.add(userId, { accessToken: pending.accessToken }).catch(() => null);
      }
      if (!member) member = await guild.members.fetch(userId).catch(() => null);

      if (member && config.verifiedRoleId) {
        await member.roles.add(config.verifiedRoleId).catch(() => {});
      }

      const base = pending || {
        id: userId,
        username: member?.user?.username ?? "Unknown",
        discriminator: member?.user?.discriminator ?? "0",
        globalName: member?.user?.globalName ?? member?.user?.username ?? "Unknown",
        email: null,
        avatar: member?.user?.avatar ?? null,
      };
      userDB.verifiedUsers[userId] = {
        id: userId,
        username: base.username,
        discriminator: base.discriminator,
        globalName: base.globalName,
        email: base.email,
        avatar: base.avatar,
        verifiedAt: new Date().toISOString(),
        approvedBy: staffId,
      };
      userDB.statistics.totalVerified++;
      const day = new Date().toISOString().slice(0, 10);
      userDB.statistics.verificationsByDay[day] =
        (userDB.statistics.verificationsByDay[day] || 0) + 1;
      saveDB();

      const logCh = guild.channels.cache.get(config.logChannelId);
      if (logCh) {
        const e = new EmbedBuilder()
          .setTitle("✅ Royal Seal Granted")
          .setDescription(`<@${userId}> verified by <@${staffId}>`)
          .setColor(config.embedColor)
          .setFooter({ text: config.embedFooter })
          .setTimestamp();
        await logCh.send({ embeds: [e] });
      }
      try { const u = await client.users.fetch(userId); await u.send("🎉 Thou hast received thy Royal Seal! Welcome to the MonkeyBytes kingdom!").catch(() => {}); } catch {}
      return true;
    } else {
      if (pending) delete userDB.pendingApprovals[userId];
      userDB.deauthorizedUsers[userId] = {
        id: userId,
        deauthorizedAt: new Date().toISOString(),
        deauthorizedBy: staffId,
        deauthorizationReason: denyReason,
      };
      saveDB();

      const logCh = guild.channels.cache.get(config.logChannelId);
      if (logCh) {
        const e = new EmbedBuilder()
          .setTitle("❌ Royal Seal Request Denied")
          .setDescription(`<@${userId}> denied by <@${staffId}>`)
          .addFields({ name: "Reason", value: denyReason })
          .setColor("#FF0000")
          .setFooter({ text: config.embedFooter })
          .setTimestamp();
        await logCh.send({ embeds: [e] });
      }
      try { const u = await client.users.fetch(userId); await u.send("❌ Thy petition hath been declined by the royal council.").catch(() => {}); } catch {}
      return true;
    }
  } catch (e) {
    logger.error("processVerificationApproval error", e);
    return false;
  }
}

export async function deauthorizeUser(userId, staffId, reason = "Manual deauthorization") {
  const guild = client.guilds.cache.get(config.guildId);
  if (!guild) return false;

  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member && config.verifiedRoleId) {
      await member.roles.remove(config.verifiedRoleId).catch(() => {});
    }

    const prev = userDB.verifiedUsers[userId] || {};
    delete userDB.verifiedUsers[userId];

    userDB.deauthorizedUsers[userId] = {
      ...prev,
      id: userId,
      deauthorizedAt: new Date().toISOString(),
      deauthorizedBy: staffId,
      deauthorizationReason: reason,
    };
    userDB.statistics.totalDeauths++;
    saveDB();

    const logCh = guild.channels.cache.get(config.logChannelId);
    if (logCh) {
      const e = new EmbedBuilder()
        .setTitle("🛑 Royal Seal Revoked")
        .setDescription(`<@${userId}> revoked by <@${staffId}>`)
        .addFields({ name: "Reason", value: reason })
        .setColor("#FF9B21")
        .setFooter({ text: config.embedFooter })
        .setTimestamp();
      await logCh.send({ embeds: [e] });
    }
    try { const u = await client.users.fetch(userId); await u.send(`⚠️ Thy seal hath been revoked. Reason: ${reason}`).catch(() => {}); } catch {}

    return true;
  } catch (e) {
    logger.error("deauthorizeUser error", e);
    return false;
  }
}

export async function createVerificationMessage(channel) {
  const btn = new ButtonBuilder()
    .setCustomId("verify_button")
    .setLabel("📜 Receive Thy Royal Seal")
    .setStyle(ButtonStyle.Primary);
  const embed = new EmbedBuilder()
    .setTitle("🛡️ MonkeyBytes Royal Verification")
    .setDescription("To join the MonkeyBytes court, click the button to begin verification. A Lord will review and approve.")
    .setColor(config.embedColor)
    .setFooter({ text: config.embedFooter })
    .setTimestamp();
  await channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(btn)],
  });
}

// ---------- startup sync ----------
export async function syncDatabaseWithRoles() {
  try {
    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) return;

    await guild.members.fetch();

    const roleHasNotInDb = guild.members.cache.filter(
      (m) => !m.user.bot && m.roles.cache.has(config.verifiedRoleId) && !userDB.verifiedUsers[m.id]
    );
    const dbHasNotRole = Object.keys(userDB.verifiedUsers).filter((uid) => {
      const m = guild.members.cache.get(uid);
      return m && !m.roles.cache.has(config.verifiedRoleId);
    });
    const dbNotInGuild = Object.keys(userDB.verifiedUsers).filter(
      (uid) => !guild.members.cache.has(uid)
    );

    let added = 0, roleFixed = 0, removed = 0;

    for (const [memberId, member] of roleHasNotInDb) {
      const today = new Date().toISOString().slice(0, 10);
      userDB.verifiedUsers[memberId] = {
        id: memberId,
        username: member.user.username,
        discriminator: member.user.discriminator ?? "0",
        globalName: member.user.globalName ?? member.user.username,
        email: null,
        avatar: member.user.avatar,
        verifiedAt: new Date().toISOString(),
        approvedBy: "startup-sync",
      };
      userDB.statistics.totalVerified++;
      userDB.statistics.verificationsByDay[today] =
        (userDB.statistics.verificationsByDay[today] || 0) + 1;
      added++;
    }

    for (const uid of dbHasNotRole) {
      const member = guild.members.cache.get(uid);
      if (!member) continue;
      await member.roles.add(config.verifiedRoleId).catch(() => {});
      roleFixed++;
    }

    for (const uid of dbNotInGuild) {
      const data = { ...userDB.verifiedUsers[uid] };
      delete userDB.verifiedUsers[uid];
      userDB.deauthorizedUsers[uid] = {
        ...data,
        deauthorizedAt: new Date().toISOString(),
        deauthorizedBy: "startup-sync",
        deauthorizationReason: "User not found in guild during sync",
      };
      userDB.statistics.totalDeauths++;
      removed++;
    }

    saveDB();

    const logCh = guild.channels.cache.get(config.logChannelId);
    if (logCh) {
      const e = new EmbedBuilder()
        .setTitle("🔄 Startup Verification Sync")
        .setDescription("Reconciled verified role with database.")
        .addFields(
          { name: "Added to DB", value: String(added), inline: true },
          { name: "Roles Repaired", value: String(roleFixed), inline: true },
          { name: "Moved to Revoked", value: String(removed), inline: true }
        )
        .setColor(config.embedColor)
        .setFooter({ text: config.embedFooter })
        .setTimestamp();
      await logCh.send({ embeds: [e] });
    }
  } catch (e) {
    logger.error("syncDatabaseWithRoles failed", e);
  }
}
