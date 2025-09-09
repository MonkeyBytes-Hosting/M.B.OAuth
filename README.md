# MB News Bot

A modern Discord bot that delivers breaking news and supports Discord OAuth2 login for staff control.  
Built with Node.js, Discord.js v14, Express, and Passport.

---

## ✨ Features
- Aggregates news from multiple sources (BBC, Sky, Al Jazeera, GB News, etc.) via RSS feeds.  
- Posts updates automatically into dedicated Discord channels.  
- Discord OAuth2 integration for staff authentication and control.  
- Logging channels for uptime, errors, and admin actions.  
- Admin-only slash commands:
  - /verify-all
  - /authorize-all
  - /verify-member
- Configurable heartbeat/uptime logging.

---

## 🛠 Requirements
- Node.js v18 or newer (recommended v20+).  
- npm (comes with Node).  
- A Discord bot token.  
- (Optional) MySQL or SQLite for persistent session storage.

---

## 📦 Installation

Clone the repository:

git clone https://github.com/yourusername/mb-news-bot.git
cd mb-news-bot

Install dependencies:

npm install

---

## ⚙️ Configuration

1. Copy .env.example to .env and fill in your values:

DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
CALLBACK_URL=http://localhost:3000/callback
SESSION_SECRET=supersecretkey

2. Adjust channel IDs and other config in your bot files as needed.

---

## 🚀 Running the Bot

Start normally:

npm start

Start in development mode (with auto-restart):

npm run dev

---

## 📂 Project Structure

├── bot.mjs          # Main bot entry
├── express.mjs      # Express + OAuth server
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

MIT License © 2025 [MonkeyBytes-Hosting]
