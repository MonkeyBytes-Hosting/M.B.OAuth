// express.mjs
import express from "express";
import escape from "escape-html";
import session from "express-session";
import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import { config } from "./config.mjs";
import { userDB, saveDB } from "./db.mjs";
import { logger } from "./logger.mjs";
import { sendVerificationRequest } from "./utils.mjs";

// Server + proxy awareness
export const app = express();
app.set("trust proxy", 1);

// Session (secure defaults; tweak for HTTPS/cross-site as needed)
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      // In HTTPS + cross-site OAuth, you may need: sameSite: "none", secure: true
      // per express-session docs and Chrome behavior. :contentReference[oaicite:1]{index=1}
    },
  })
);

// Passport boot
app.use(passport.initialize());
app.use(passport.session());

// Optional: log raw OAuth error bodies for clarity when Discord returns one
app.use((req, res, next) => {
  const strat = passport._strategies?.["discord"];
  if (strat && strat._oauth2 && !strat._oauth2._wrapped) {
    const orig = strat._oauth2._request.bind(strat._oauth2);
    strat._oauth2._wrapped = true;
    strat._oauth2._request = (method, url, headers, body, accessToken, cb) => {
      return orig(method, url, headers, body, accessToken, (err, data, res2) => {
        if (err && err.data) console.error("[Discord OAuth error body]", err.data.toString());
        cb(err, data, res2);
      });
    };
  }
  next();
});

// Minimal user serialization to session
passport.serializeUser((u, d) => d(null, u.id));
passport.deserializeUser((id, d) => d(null, userDB.verifiedUsers[id] || null));

// Discord OAuth strategy
passport.use(
  new DiscordStrategy(
    {
      clientID: config.clientId,
      clientSecret: config.clientSecret,
      callbackURL: config.redirectUri,
      scope: ["identify", "email", "guilds.join"],
    },
    (accessToken, refreshToken, profile, done) => {
      const user = {
        id: profile.id,
        username: profile.username,
        discriminator: profile.discriminator || "0",
        globalName: profile.global_name || profile.username,
        avatar: profile.avatar,
        email: profile.email ?? null,
        accessToken,
        refreshToken,
        submittedAt: new Date().toISOString(),
      };
      return done(null, user);
    }
  )
);

// ---------- Pages ----------
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>MonkeyBytes Verification</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;background:#0b0f14;color:#e6f1ff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
  .card{background:#121923;border:1px solid #203040;border-radius:16px;padding:28px;max-width:520px;width:92%;box-shadow:0 10px 30px rgba(0,0,0,.35)}
  h1{margin:0 0 6px;font-size:1.4rem}
  p{margin:0 0 18px;color:#a8c3e6}
  a.btn{display:inline-block;padding:12px 18px;border-radius:10px;text-decoration:none;background:#5865F2;color:#fff;font-weight:600}
  small{display:block;margin-top:12px;color:#7ea2d6}
</style>
</head>
<body>
  <div class="card">
    <h1>🛡️ MonkeyBytes Royal Verification</h1>
    <p>Click the button below to start verification via Discord. A staff member will approve you shortly.</p>
    <a class="btn" href="/auth">Verify with Discord</a>
    <small>If the popup doesn't open, try again or disable blockers.</small>
  </div>
</body></html>`);
});

app.get("/done", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Submitted for Approval</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;background:#0b0f14;color:#e6f1ff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
  .card{background:#121923;border:1px solid #203040;border-radius:16px;padding:28px;max-width:560px;width:92%;box-shadow:0 10px 30px rgba(0,0,0,.35)}
  h1{margin:0 0 6px;font-size:1.4rem}
  p{margin:0;color:#a8c3e6}
</style>
</head>
<body><div class="card">
  <h1>✅ Submitted for approval.</h1>
  <p>You can close this tab and return to Discord.</p>
</div></body></html>`);
});

// ---------- OAuth ----------
app.get("/auth", passport.authenticate("discord", {
  scope: ["identify", "email", "guilds.join"],
  prompt: "consent",
}));

app.get(
  "/auth/callback",
  passport.authenticate("discord", { failureRedirect: "/auth-fail" }),
  async (req, res) => {
    try {
      userDB.pendingApprovals[req.user.id] = req.user;
      saveDB();
      await sendVerificationRequest(req.user.id, req.user.username);
      res.redirect("/done");
    } catch (e) {
      logger.error("Callback error", e);
      res.status(500).send("<h2>Auth error. Try again.</h2>");
    }
  }
);

app.get("/auth-fail", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(401).end(`<!doctype html>
<html><head><meta charset="utf-8"><title>Auth failed</title>
<style>
  body{font-family:system-ui;background:#0b0f14;color:#e6f1ff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
  .card{background:#121923;border:1px solid #203040;border-radius:16px;padding:28px;max-width:560px;width:92%;}
  a{color:#8ab4ff}
</style></head>
<body><div class="card">
  <h1>❌ Authentication failed</h1>
  <p>${escape((req.query.error || "Unknown error").toString())}</p>
  <p><a href="/auth">Try again</a></p>
</div></body></html>`);
});

// ---------- JSON endpoints (staff convenience) ----------
app.get("/pending", (req, res) => {
  const list = Object.values(userDB.pendingApprovals).map(u => ({
    id: u.id, username: u.username, globalName: u.globalName, submittedAt: u.submittedAt
  }));
  res.json({ count: list.length, pending: list });
});
app.get("/verified", (req, res) => {
  const list = Object.values(userDB.verifiedUsers).map(u => ({
    id: u.id, username: u.username, globalName: u.globalName, verifiedAt: u.verifiedAt
  }));
  res.json({ count: list.length, verified: list });
});

// Exposed starter
export function startExpress() {
  return app.listen(config.port, () => logger.startup(`Web server on ${config.port}`));
}
