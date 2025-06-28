const config = require('../config');

module.exports = function autoview(sock) {
  if (config.AutoViewStatus !== 'on') return; // ✅ Skip kalau config off

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' || !Array.isArray(messages)) return;

    for (const msg of messages) {
      try {
        const { key, pushName, message } = msg;
        if (key.remoteJid !== 'status@broadcast' || key.fromMe || !message) continue;

        const name = pushName || 'Tanpa Nama';
        console.log(`👀 Melihat story dari: ${name}`);
        await sock.readMessages([key]);
      } catch (err) {
        console.error('❌ Gagal auto-view story:', err);
      }
    }
  });
};