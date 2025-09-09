// config.mjs
import 'dotenv/config';

function env(name, fallback) {
  const v = process.env[name];
  return (v !== undefined && v !== '') ? v : fallback;
}

export const config = {
  clientId: env('DISCORD_CLIENT_ID', ''),
  clientSecret: env('DISCORD_CLIENT_SECRET', ''),
  token: env('DISCORD_BOT_TOKEN', ''),

  port: Number(env('PORT', 3001)),
  redirectUri: env('REDIRECT_URI', 'http://localhost:3001/auth/callback'),
  serverUrl: env('SERVER_URL', 'http://localhost:3001'),
  sessionSecret: env('SESSION_SECRET', 'Royal Seal of Approval'),

  guildId: env('GUILD_ID', ''),
  adminRoleId: env('ADMIN_ROLE_ID', ''),
  verifiedRoleId: env('VERIFIED_ROLE_ID', ''),

  verificationChannelId: env('VERIFICATION_CHANNEL_ID', ''),
  approvalChannelId: env('APPROVAL_CHANNEL_ID', ''),
  logChannelId: env('LOG_CHANNEL_ID', ''),
  heartbeatChannelId: env('HEARTBEAT_CHANNEL_ID', ''),
  uptimeLogsChannelId: env('UPTIME_LOGS_CHANNEL_ID', ''),

  dbPath: env('DB_PATH', './monkey-verified-users.json'),
  embedColor: env('EMBED_COLOR', '#3eff06'),
  embedFooter: env('EMBED_FOOTER', '© MonkeyBytes Tech | The Royal Court'),

  heartbeatInterval: Number(env('HEARTBEAT_INTERVAL_MS', 630000)),
  uptimeInterval: Number(env('UPTIME_INTERVAL_MS', 300000)),
};
