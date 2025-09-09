# MonkeyBytes Hosting - Discord OAuth Bot

A modern Discord bot developed by **MonkeyBytes Hosting**.  
It provides **Discord OAuth2 authentication** with an Express backend for managing staff and user verification.  
Built with Node.js, Discord.js v14, Express, Passport, and Passport-Discord.

---

## ✨ Features
- Full **Discord OAuth2 login system** using `passport-discord`.  
- Uses `express` + `express-session` for handling user sessions.  
- OAuth2 callback flow integrated with Discord Application.  
- Logging channels for uptime, errors, and staff actions.  
- Admin-only slash commands for user control:
  - `/verify-all`
  - `/authorize-all`
  - `/verify-member`
- Configurable heartbeat/uptime logging.  

---

## 🛠 Requirements
- Node.js v18 or newer (recommended v20+).  
- npm (comes with Node).  
- A Discord bot token.  
- Discord Application with OAuth2 enabled:
  - Client ID  
  - Client Secret  
  - Redirect URI (e.g. `http://localhost:3000/callback`)  
- (Optional) MySQL or SQLite for persistent session storage (default is memory).

---

## 📦 Installation

Clone the repository:

git clone https://github.com/MonkeyBytesHosting/mb-oauth-bot.git
cd mb-oauth-bot

Install dependencies:

npm install

---

## ⚙️ Configuration

1. Copy `.env.example` to `.env` and fill in your values:

DISCORD_TOKEN=your-bot-token  
DISCORD_CLIENT_ID=your-client-id  
DISCORD_CLIENT_SECRET=your-client-secret  
CALLBACK_URL=http://localhost:3000/callback  
SESSION_SECRET=supersecretkey  

2. Adjust channel IDs and other config in `bot.mjs` and `express.mjs` as needed.

---

## 🚀 Running the Bot

Start normally:

npm start

Start in development mode (with auto-restart):

npm run dev

---

## 📂 Project Structure

├── bot.mjs          # Main Discord bot entry  
├── express.mjs      # Express server + OAuth2 login (passport-discord)  
├── package.json     # Dependencies and scripts  
├── .env.example     # Environment variable template  
└── README.md        # This file  

---

## 🤝 Contributing

1. Fork the repo.  
2. Create a feature branch:  
   git checkout -b feature/amazing-feature  
3. Commit changes:  
   git commit -m "Add amazing feature"  
4. Push to the branch and open a Pull Request.  

---

## 📜 License

MIT License © 2025 MonkeyBytes Hosting
