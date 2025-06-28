const fs = require('fs');
const os = require('os');
const chalk = require('chalk');
const { downloadMediaMessage } = require('baileys');
const { downloadMp3, downloadMp4 } = require('./yt');
const getBufferFromUrl = require('./getBufferFromUrl');
const { writeExif } = require('./sticker');
const sendMenuButtons = require('./sendMenu');
const { checkIn, getStreak } = require('./checkin');
const kirimVN = require('./kirimVN');
const { BOT_NAME, OWNER_NAME, OWNER_NUMBER, packname, author } = require('../config'); // atau './config'

const imagePath = './icon.png';
const imageBuffer = fs.existsSync(imagePath)
  ? fs.readFileSync(imagePath)
  : null;

module.exports = async function handleMessage(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || from;
  if (msg.key.fromMe) return;

  const name = msg.pushName || 'Tanpa Nama';
const group = from.endsWith('@g.us') ? ' (Group)' : '';

let type = Object.keys(msg.message || {})[0];
let body = 
  msg.message?.conversation ||
  msg.message?.extendedTextMessage?.text ||
  msg.message?.imageMessage?.caption ||
  msg.message?.videoMessage?.caption ||
  msg.message?.buttonsResponseMessage?.selectedButtonId ||
  msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
  msg.message?.templateButtonReplyMessage?.selectedId ||
  msg.message?.interactiveResponseMessage?.body?.text || // buat yang mod support ini
  msg.message?.[type]?.text ||
  msg.message?.[type]?.caption ||
  msg.message?.[type]?.selectedId || // fallback template
  '';

// Quoted reply (kalau pengen ambil juga dari reply)
if (!body && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
  let quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
  let qtype = Object.keys(quoted)[0];
  body = quoted[qtype]?.text || quoted[qtype]?.caption || '';
}

if (!body) return; // stop kalau tetap kosong

console.log(
  chalk.cyanBright(`⚡ XenoviaAI → 📨 ${name}${group}`),
  chalk.gray(`💬 ${body}`)
);

  const command = body.trim().split(' ')[0].toLowerCase();
  const args = body.trim().split(' ').slice(1).join(' ');
  const teks = body.trim().toLowerCase();

  switch (command) {
    case 'menu':
case '.menu':
  await sendMenuButtons(sock, msg);
  break;

    case '.runtime':
    case 'r':
      const formatTime = (sec) => {
        const d = Math.floor(sec / 86400);
        const h = Math.floor((sec % 86400) / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        return `${d}h ${h}j ${m}m ${s}s`;
      };

      const uptime = formatTime(process.uptime());
      const vpsUptime = formatTime(os.uptime());
      const cpu = os.cpus()[0]?.model || 'Unknown';
      const ramFree = (os.freemem() / 1e9).toFixed(2);
      const ramTotal = (os.totalmem() / 1e9).toFixed(2);
      const osInfo = `${os.platform()} ${os.arch()}`;

      const info = `🔧 *XenoviaAI Runtime Report*

🖥 Server Info:
├ 🧠 CPU : ${cpu}
├ 💾 RAM : ${ramFree} GB / ${ramTotal} GB
├ 🖥 OS  : ${osInfo}
└ 🔁 Uptime VPS: ${vpsUptime}

⏱ Bot Aktif Selama: ${uptime}
🤖 Bot: ${BOT_NAME}
👤 Owner: ${OWNER_NAME}
📞 Kontak: wa.me/${OWNER_NUMBER}
⚡ Powered by Xenovia Holdings Ltd.`;

      await sock.sendMessage(from, { text: info }, { quoted: msg });
      break;

    case 'cekin':
      await sock.sendMessage(
        from,
        { text: checkIn(sender) },
        { quoted: msg }
      );
      break;

    case 'streak':
      await sock.sendMessage(
        from,
        { text: getStreak(sender) },
        { quoted: msg }
      );
      break;

    case 'play':
      if (!args) {
        await sock.sendMessage(
          from,
          { text: 'Masukkan judul atau link YouTube!' },
          { quoted: msg }
        );
        return;
      }
      try {
        const result = await downloadMp3(args);
        const thumb = await getBufferFromUrl(result.thumbnail);

        await sock.sendMessage(
          from,
          {
            audio: result.buffer,
            mimetype: 'audio/mp4',
            ptt: true,
            fileName: `${result.title}.mp3`,
            contextInfo: {
              externalAdReply: {
                title: result.title,
                body: 'XenoviaCompanyGlobal',
                thumbnail: thumb,
                mediaType: 2,
                renderLargerThumbnail: true
              }
            }
          },
          { quoted: msg }
        );
      } catch {
        await sock.sendMessage(
          from,
          { text: 'Gagal mengambil audio.' },
          { quoted: msg }
        );
      }
      break;

    case 'mp4':
      if (!args) {
        await sock.sendMessage(
          from,
          { text: 'Masukkan judul atau link YouTube!' },
          { quoted: msg }
        );
        return;
      }
      try {
        const result = await downloadMp4(args);
        const thumb = await getBufferFromUrl(result.thumbnail);

        await sock.sendMessage(
          from,
          {
            video: result.buffer,
            mimetype: 'video/mp4',
            fileName: `${result.title}.mp4`,
            caption: `${result.title}\nDurasi: ${result.duration}`,
            jpegThumbnail: thumb
          },
          { quoted: msg }
        );
      } catch {
        await sock.sendMessage(
          from,
          { text: 'Gagal mengambil video.' },
          { quoted: msg }
        );
      }
      break;

    case '.sticker':
    case 's':
      try {
        const quoted =
          msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const isQuoted = !!quoted;

        const mediaMsg = isQuoted
          ? {
              message: quoted,
              key: {
                remoteJid: msg.key.remoteJid,
                id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                fromMe: false,
                participant:
                  msg.message.extendedTextMessage.contextInfo.participant
              }
            }
          : msg;

        const msgType = isQuoted
          ? Object.keys(quoted)[0]
          : Object.keys(msg.message)[0];

        if (!['imageMessage', 'videoMessage'].includes(msgType)) {
          await sock.sendMessage(
            msg.key.remoteJid,
            { text: '❌ Kirim atau reply foto/video untuk dijadikan stiker.' },
            { quoted: msg }
          );
          return;
        }

        const media = await downloadMediaMessage(mediaMsg, 'buffer', {}, {});
        const sticker = await writeExif(media, { packname, author });

        await sock.sendMessage(
          msg.key.remoteJid,
          { sticker: { url: sticker } },
          { quoted: msg }
        );

        if (typeof sticker === 'string' && fs.existsSync(sticker)) {
          fs.unlinkSync(sticker);
        }
      } catch {
        await sock.sendMessage(
          msg.key.remoteJid,
          { text: '⚠️ Gagal membuat stiker.' },
          { quoted: msg }
        );
      }
      break;
  }

  // Voice note trigger
  const vnList = {
    'good morning': 'Selamat pagi semuanya!',
    'good night': 'Selamat malam, mimpi indah ya!',
    hello: 'Hai! Ada yang bisa aku bantu?',
    xenovia: 'Saya Xenovia, siap membantu~'
  };

  for (const key of Object.keys(vnList)) {
    if (teks.includes(key)) {
      await kirimVN(sock, msg, vnList[key]);
    }
  }
};
