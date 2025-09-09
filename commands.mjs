// commands.mjs
import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import { config } from "./config.mjs";
import { client } from "./discord_client.mjs";
import { userDB } from "./db.mjs";
import {
  isAdmin,
  processVerificationApproval,
  deauthorizeUser,
  syncDatabaseWithRoles,
} from "./utils.mjs";

// Register slash commands to the guild (fast dev loop per Discord.js guide). :contentReference[oaicite:2]{index=2}
export async function registerCommands(guild) {
  const commands = [
    { name: "verify", description: "Begin the royal verification process", type: ApplicationCommandType.ChatInput },
    { name: "status", description: "[Admin] Show service status", type: ApplicationCommandType.ChatInput },
    {
      name: "auth",
      description: "[Admin] Approve a single pending user (or manual override)",
      type: ApplicationCommandType.ChatInput,
      options: [
        { name: "user", description: "User to approve", type: ApplicationCommandOptionType.User, required: true },
      ],
    },
    {
      name: "deny",
      description: "[Admin] Deny a single pending user",
      type: ApplicationCommandType.ChatInput,
      options: [
        { name: "user", description: "User to deny", type: ApplicationCommandOptionType.User, required: true },
        { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
      ],
    },
    {
      name: "deauth",
      description: "[Admin] Revoke a verified user",
      type: ApplicationCommandType.ChatInput,
      options: [
        { name: "user", description: "User to revoke", type: ApplicationCommandOptionType.User, required: true },
        { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
      ],
    },
    { name: "auth-all", description: "[Admin] Approve ALL pending", type: ApplicationCommandType.ChatInput },
    { name: "deauth-all", description: "[Admin] Revoke all verified users", type: ApplicationCommandType.ChatInput },
    { name: "sync-now", description: "[Admin] Force a DB↔Role resync now", type: ApplicationCommandType.ChatInput },
    { name: "menu", description: "[Admin] DM me the bot endpoints", type: ApplicationCommandType.ChatInput },
  ];
  await guild.commands.set(commands);
}

// Command handlers
export const commandHandlers = {
  async verify(interaction) {
    if (userDB.verifiedUsers?.[interaction.user.id]) {
      return interaction.reply({ content: "✅ Thou already beareth the Royal Seal!", ephemeral: true });
    }
    const url = `${config.serverUrl}/auth`;
    const button = new ButtonBuilder().setLabel("Open Verification").setStyle(ButtonStyle.Link).setURL(url);
    const row = new ActionRowBuilder().addComponents(button);
    return interaction.reply({ content: "Proceed to the royal gates:", components: [row], ephemeral: true });
  },

  async status(interaction) {
    if (!isAdmin(interaction.member)) return interaction.reply({ content: "Admins only.", ephemeral: true });
    const s = {
      verified: Object.keys(userDB.verifiedUsers).length,
      pending: Object.keys(userDB.pendingApprovals).length,
      deauths: Object.keys(userDB.deauthorizedUsers).length,
    };
    const uptimeSec = Math.floor(process.uptime());
    const embed = new EmbedBuilder()
      .setTitle("🧭 Service Status")
      .addFields(
        { name: "Bot", value: `🟢 Online | ${client.user.tag}`, inline: true },
        { name: "Uptime (sec)", value: String(uptimeSec), inline: true },
        { name: "Latency", value: `${client.ws.ping}ms`, inline: true },
        { name: "Verified Users", value: `${s.verified}`, inline: true },
        { name: "Pending Approvals", value: `${s.pending}`, inline: true },
        { name: "Revoked", value: `${s.deauths}`, inline: true },
      )
      .setColor(config.embedColor)
      .setFooter({ text: config.embedFooter })
      .setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async auth(interaction) {
    if (!isAdmin(interaction.member)) return interaction.reply({ content: "Admins only.", ephemeral: true });
    const target = interaction.options.getUser("user", true);
    await interaction.deferReply({ ephemeral: true });
    const ok = await processVerificationApproval(target.id, true, interaction.user.id);
    return interaction.editReply({ content: ok ? `✅ Approved <@${target.id}>.` : "❌ Failed to approve." });
  },

  async deny(interaction) {
    if (!isAdmin(interaction.member)) return interaction.reply({ content: "Admins only.", ephemeral: true });
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "Denied by staff";
    await interaction.deferReply({ ephemeral: true });
    const ok = await processVerificationApproval(target.id, false, interaction.user.id, reason);
    return interaction.editReply({ content: ok ? `🚫 Denied <@${target.id}>.` : "❌ Failed to deny." });
  },

  async deauth(interaction) {
    if (!isAdmin(interaction.member)) return interaction.reply({ content: "Admins only.", ephemeral: true });
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "Manual deauthorization";
    await interaction.deferReply({ ephemeral: true });
    const ok = await deauthorizeUser(target.id, interaction.user.id, reason);
    return interaction.editReply({ content: ok ? `🛑 Revoked <@${target.id}>.` : "❌ Failed to revoke." });
  },

  async "auth-all"(interaction) {
    if (!isAdmin(interaction.member)) return interaction.reply({ content: "Admins only.", ephemeral: true });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("confirm_auth_all").setLabel("Approve All Pending").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("cancel_auth_all").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
    );
    return interaction.reply({ content: "Approve ALL pending requests?", components: [row], ephemeral: true });
  },

  async "deauth-all"(interaction) {
    if (!isAdmin(interaction.member)) return interaction.reply({ content: "Admins only.", ephemeral: true });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("confirm_deauth_all").setLabel("Revoke All Verified").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel_deauth_all").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
    );
    return interaction.reply({ content: "Revoke ALL verified users?", components: [row], ephemeral: true });
  },

  async "sync-now"(interaction) {
    if (!isAdmin(interaction.member)) return interaction.reply({ content: "Admins only.", ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    await syncDatabaseWithRoles();
    return interaction.editReply({ content: "✅ Sync complete." });
  },

  async menu(interaction) {
    if (!isAdmin(interaction.member)) return interaction.reply({ content: "Admins only.", ephemeral: true });

    const endpoints = [
      `${config.serverUrl}/`,
      `${config.serverUrl}/auth`,
      `${config.serverUrl}/auth/callback`,
      `${config.serverUrl}/done`,
      `${config.serverUrl}/pending`,
      `${config.serverUrl}/verified`,
    ].join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🔗 MonkeyBytes Auth — Endpoints")
      .setDescription("Here are the useful endpoints for staff:")
      .addFields(
        { name: "Base", value: `${config.serverUrl}/`, inline: false },
        { name: "Start OAuth", value: `${config.serverUrl}/auth`, inline: false },
        { name: "Callback", value: `${config.serverUrl}/auth/callback`, inline: false },
        { name: "Success Page", value: `${config.serverUrl}/done`, inline: false },
        { name: "Pending (JSON)", value: `${config.serverUrl}/pending`, inline: false },
        { name: "Verified (JSON)", value: `${config.serverUrl}/verified`, inline: false },
      )
      .setColor(config.embedColor)
      .setFooter({ text: config.embedFooter })
      .setTimestamp();

    let dmOK = true;
    try {
      const dm = await interaction.user.createDM();
      await dm.send({ embeds: [embed] });
    } catch {
      dmOK = false;
    }

    if (dmOK) {
      return interaction.reply({ content: "📬 Sent you a DM with the endpoints.", ephemeral: true });
    } else {
      return interaction.reply({
        content: "⚠️ I couldn't DM you (privacy settings). Here they are:\n" + endpoints,
        ephemeral: true,
      });
    }
  },
};
