// interactions.mjs
import { client } from "./discord_client.mjs";
import { commandHandlers } from "./commands.mjs";
import { isAdmin, processVerificationApproval, deauthorizeUser } from "./utils.mjs";
import { userDB, saveDB } from "./db.mjs";
import { config } from "./config.mjs";
import { ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import { logger } from "./logger.mjs";

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const handler = commandHandlers[interaction.commandName];
      if (handler) return handler(interaction);
    }

    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === "verify_button") {
        if (userDB.verifiedUsers?.[interaction.user.id]) {
          return interaction.reply({ content: "✅ Thou already beareth the Royal Seal!", ephemeral: true });
        }
        const url = `${config.serverUrl}/auth`;
        const btn = new ButtonBuilder().setLabel("Open Verification").setStyle(ButtonStyle.Link).setURL(url);
        return interaction.reply({
          content: "Proceed to the royal gates:",
          components: [new ActionRowBuilder().addComponents(btn)],
          ephemeral: true,
        });
      }

      // Approve/Deny single — ADMIN role required
      if (id.startsWith("approve_") || id.startsWith("deny_")) {
        if (!isAdmin(interaction.member)) return interaction.reply({ content: "Admins only.", ephemeral: true });
        const approved = id.startsWith("approve_");
        const userId = id.split("_")[1];
        await interaction.deferReply({ ephemeral: true });
        const ok = await processVerificationApproval(userId, approved, interaction.user.id);
        return interaction.editReply({ content: ok ? (approved ? "Approved." : "Denied.") : "Failed." });
      }

      // Confirm/cancel bulk APPROVE
      if (id === "confirm_auth_all" || id === "cancel_auth_all") {
        if (!isAdmin(interaction.member)) return interaction.reply({ content: "Admins only.", ephemeral: true });
        if (id === "cancel_auth_all") return interaction.reply({ content: "Canceled.", ephemeral: true });
        await interaction.deferReply({ ephemeral: true });
        const userIds = Object.keys(userDB.pendingApprovals);
        let ok = 0;
        for (const uid of userIds) {
          const res = await processVerificationApproval(uid, true, interaction.user.id);
          if (res) ok++;
        }
        return interaction.editReply({ content: `Approved ${ok}/${userIds.length} pending.` });
      }

      // Confirm/cancel bulk DEAUTH
      if (id === "confirm_deauth_all" || id === "cancel_deauth_all") {
        if (!isAdmin(interaction.member)) return interaction.reply({ content: "Admins only.", ephemeral: true });
        if (id === "cancel_deauth_all") return interaction.reply({ content: "Canceled.", ephemeral: true });

        await interaction.deferReply({ ephemeral: true });
        let count = 0;
        for (const uid of Object.keys(userDB.verifiedUsers)) {
          const res = await deauthorizeUser(uid, interaction.user.id, "Mass deauth");
          if (res) count++;
        }
        saveDB();
        return interaction.editReply({ content: `Revoked ${count} users.` });
      }
    }
  } catch (e) {
    logger.error("interactionCreate error", e);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: "❌ Error." });
      } else {
        await interaction.reply({ content: "❌ Error.", ephemeral: true });
      }
    } catch {}
  }
});
