"use strict";

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = require("baileys");

const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");
const { Boom } = require("@hapi/boom");
const logger = require("pino");
const chalk = require("chalk");

const config = require("./config");
const handleMessage = require("./lib/xenovia");
const { cloneOrUpdateRepo } = require("./lib/cekUpdate");
const {
  mylog, warnlog, errorlog, successlog, infolog, banner
} = require("./lib/color");

process.on("uncaughtException", err => {
  console.log(errorlog("💥 Uncaught Exception:"), err);
});

console.clear();
console.log(banner("Xenovia AI"));
console.log(successlog("🚀 Bot sedang dijalankan...\n"));

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

checkAndUpdate().catch(err =>
  console.log(errorlog("❌ Gagal start bot atau update:"), err)
);

async function checkAndUpdate() {
  if (config.AutoUpdate === "on") {
    console.log(infolog("[🔄] Mengecek update dari GitHub..."));
    await cloneOrUpdateRepo();
    console.log(successlog("[✅] Update selesai."));
  } else {
    console.log(warnlog("[ℹ️] AutoUpdate dimatikan di config."));
  }

  const credsPath = "./sessions/creds.json";
  if (fs.existsSync(credsPath)) {
    try {
      JSON.parse(fs.readFileSync(credsPath));
    } catch (e) {
      console.log(warnlog("🧨 Deteksi sesi rusak. Menghapus dan mengulang..."));
      fs.rmSync("./sessions", { recursive: true, force: true });
    }
  }

  await connectToWhatsApp();
}

async function connectToWhatsApp() {
  const sessionDir = "./sessions";
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: logger({ level: "silent" }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger({ level: "silent" }))
    },
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    printQRInTerminal: false,
    syncFullHistory: false
  });

  global.sock = sock;

  // Pairing code
  if (!sock.authState.creds.registered && config.type_connection.toLowerCase() === "pairing") {
    try {
      console.log(infolog("🕓 Menyiapkan pairing code..."));
      await delay(4000);
      const code = await sock.requestPairingCode(config.phone_number_bot.trim());
      console.log(chalk.blue("🔗 PHONE NUMBER:"), chalk.yellow(config.phone_number_bot));
      console.log(chalk.green("🔐 PAIRING CODE:"), chalk.yellow(code));
    } catch (err) {
      const status = err?.output?.statusCode || err?.data?.statusCode || null;
      const message = err?.output?.payload?.message || err?.message || "";
      console.log(errorlog("❌ Gagal generate pairing code:"), message);
      if ([401, 428].includes(status) || message.toLowerCase().includes("closed")) {
        console.log(warnlog("🛑 Pairing gagal. Reset sesi..."));
        if (fs.existsSync("./sessions")) fs.rmSync("./sessions", { recursive: true, force: true });
        await delay(3000);
        process.exit(1);
      }
    }
  }

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr && config.type_connection.toLowerCase() === "qr") {
      console.clear();
      console.log(banner("Xenovia AI"));
      console.log(successlog("📲 Scan QR berikut:\n"));
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log(successlog("✅ Terhubung ke WhatsApp!"));
      await delay(2000);
      await sock.sendMessage(`${config.phone_number_bot}@s.whatsapp.net`, {
        text: "✅ Bot Connected"
      });
    }

    if (connection === "close") {
      const boom = new Boom(lastDisconnect?.error);
      const code = boom?.output?.statusCode || lastDisconnect?.error?.output?.statusCode;
      const reconnect = code !== DisconnectReason.loggedOut;

      const reason = {
        [DisconnectReason.badSession]: "Sesi korup. Hapus dan login ulang.",
        [DisconnectReason.connectionClosed]: "Koneksi tertutup.",
        [DisconnectReason.connectionLost]: "Koneksi terputus.",
        [DisconnectReason.connectionReplaced]: "Digantikan sesi lain.",
        [DisconnectReason.loggedOut]: "Logout dari perangkat.",
        [DisconnectReason.restartRequired]: "Restart diperlukan.",
        [DisconnectReason.timedOut]: "Timeout koneksi."
      };

      console.log(errorlog(`❌ Koneksi putus: ${reason[code] || "Unknown"} (${code})`));

      if (code === DisconnectReason.loggedOut || code === DisconnectReason.badSession) {
        console.log(warnlog("🔁 Reset sesi dan coba ulang..."));
        fs.rmSync("./sessions", { recursive: true, force: true });
        await delay(2000);
        return await connectToWhatsApp();
      }

      if (reconnect) {
        console.log(warnlog("🔁 Mencoba reconnect..."));
        await delay(2000);
        return await connectToWhatsApp();
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    if (!Array.isArray(messages) || !messages[0]) return;
    await handleMessage(sock, messages[0]);
  });

  // Permissions
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
  fs.chmodSync(sessionDir, 0o755);
  fs.readdir(sessionDir, (err, files) => {
    if (!err) {
      files.forEach(file => {
        fs.chmod(path.join(sessionDir, file), 0o644, err => {
          if (err) console.log(warnlog("⚠️ Gagal ubah permission:", err));
        });
      });
    }
  });

  sock.reply = (from, content, msg) =>
    sock.sendMessage(from, { text: content }, { quoted: msg });

  sock.sendMessageFromContent = async (jid, content) =>
    await sock.relayMessage(jid, content.message, { messageId: content.key.id });

  // Load fitur
  require("./lib/motiv")(sock);
  require("./lib/tagabsen")(sock);
  require("./lib/autoview")(sock);

  return sock;
}