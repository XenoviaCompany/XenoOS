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
const { mylog, warnlog, errorlog, successlog, infolog, banner } = require("./lib/color");

const delay = ms => new Promise(res => setTimeout(res, ms));

process.on("uncaughtException", err => console.log(errorlog("💥 Uncaught Exception:"), err));

// Banner awal
console.clear();
console.log(banner("Xenovia AI"));
console.log(successlog("🚀 Bot sedang dijalankan...\n"));

main().catch(err => console.log(errorlog("❌ Error utama:"), err));

async function main() {
  await checkAndUpdate();
  await connectToWhatsApp();
}

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
    } catch {
      console.log(warnlog("🧨 Deteksi sesi rusak. Menghapus dan mengulang..."));
      fs.rmSync("./sessions", { recursive: true, force: true });
    }
  }
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

  if (!sock.authState.creds.registered && config.type_connection.toLowerCase() === "pairing") {
    try {
      console.log(infolog("🕓 Menyiapkan pairing code..."));
      await delay(5000);
      const code = await sock.requestPairingCode(config.phone_number_bot.trim());
      console.log(chalk.blue("🔗 PHONE:"), chalk.yellow(config.phone_number_bot));
      console.log(chalk.green("🔐 CODE:"), chalk.yellow(code));
    } catch (err) {
      const status = err?.output?.statusCode || err?.data?.statusCode;
      const message = err?.output?.payload?.message || err?.message || "";
      console.log(errorlog("❌ Gagal pairing:"), message);
      if ([401, 428].includes(status) || message.toLowerCase().includes("closed")) {
        fs.rmSync("./sessions", { recursive: true, force: true });
        console.log(warnlog("🛑 Pairing gagal. Reset sesi..."));
        process.exit(1);
      }
    }
  }

  sock.ev.on("connection.update", update => handleConnectionUpdate(sock, update));
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      if (!messages?.[0]) return;
      await handleMessage(sock, messages[0]);
    } catch (err) {
      console.log(errorlog("🧨 Gagal handle pesan:"), err);
    }
  });

  setFilePermissions(sessionDir);

  sock.reply = (from, text, msg) => sock.sendMessage(from, { text }, { quoted: msg });
  sock.sendMessageFromContent = async (jid, content) =>
    sock.relayMessage(jid, content.message, { messageId: content.key.id });

  // Load fitur tambahan
  require("./lib/motiv")(sock);
  require("./lib/tagabsen")(sock);
  require("./lib/autoview")(sock);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log(warnlog("🛑 Bot dimatikan..."));
    await sock.logout();
    process.exit(0);
  });

  return sock;
}

function handleConnectionUpdate(sock, { connection, lastDisconnect, qr }) {
  if (qr && config.type_connection.toLowerCase() === "qr") {
    console.clear();
    console.log(banner("Xenovia AI"));
    console.log(successlog("📲 Scan QR berikut:\n"));
    qrcode.generate(qr, { small: true });
  }

  if (connection === "open") {
    console.log(successlog("✅ Terhubung ke WhatsApp!"));
    delay(2000).then(() => {
      sock.sendMessage(`${config.phone_number_bot}@s.whatsapp.net`, { text: "✅ Bot Connected" });
    });
  }

  if (connection === "close") {
    const boom = new Boom(lastDisconnect?.error);
    const code = boom?.output?.statusCode || lastDisconnect?.error?.output?.statusCode;
    const reason = {
      [DisconnectReason.badSession]: "Sesi rusak",
      [DisconnectReason.connectionClosed]: "Koneksi tertutup",
      [DisconnectReason.connectionLost]: "Koneksi hilang",
      [DisconnectReason.connectionReplaced]: "Sesi digantikan",
      [DisconnectReason.loggedOut]: "Logout",
      [DisconnectReason.restartRequired]: "Restart perlu",
      [DisconnectReason.timedOut]: "Timeout"
    };

  //console.log(errorlog(`❌ Koneksi putus: ${reason[code] || "Unknown"} (${code})`));

    if ([DisconnectReason.loggedOut, DisconnectReason.badSession].includes(code)) {
      fs.rmSync("./sessions", { recursive: true, force: true });
      console.log(warnlog("🔁 Reset sesi dan login ulang..."));
      return connectToWhatsApp(); // tanpa await = biar nggak nested
    }

    console.log(warnlog("🔁 Mencoba reconnect..."));
    return connectToWhatsApp();
  }
}

function setFilePermissions(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.chmodSync(dir, 0o755);
  fs.readdir(dir, (err, files) => {
    if (!err) {
      for (const file of files) {
        fs.chmod(path.join(dir, file), 0o644, err => {
          if (err) console.log(warnlog("⚠️ Gagal ubah permission:", err));
        });
      }
    }
  });
}
