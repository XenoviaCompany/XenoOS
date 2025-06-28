const { proto } = require('baileys'); // pastikan ini kalau perlu buat listMessage

module.exports = async function sendMenuButtons(sock, msg) {
  const from = msg.key.remoteJid;
  const isGroup = from.endsWith('@g.us');

  const menuText = `
╭───〔 *XenoviaAI Menu* 〕
│ 👋 Selamat datang!
│ Tombol ini belum aktif semua ya...
╰──〔 ⚡ Xenovia Holdings Ltd. 〕`.trim();

  try {
    if (isGroup) {
      // Kirim tombol biasa kalau di grup
      await sock.sendMessage(
        from,
        {
          buttons: [
            { buttonId: 'cekin', buttonText: { displayText: '✅ Cekin (Coming Soon)' }, type: 1 },
            { buttonId: 'streak', buttonText: { displayText: '🔥 Streak (Soon)' }, type: 1 },
            { buttonId: 'r', buttonText: { displayText: '🕒 Runtime' }, type: 1 }
          ],
          contentText: menuText,
          footerText: 'XenoviaAI',
          headerType: 1
        },
        { quoted: msg }
      );
    } else {
      // Kirim list menu kalau di chat pribadi
      await sock.sendMessage(
        from,
        {
          title: 'XenoviaAI Menu',
          text: menuText,
          footer: 'Silakan pilih menu:',
          buttonText: '📋 Buka Menu',
          sections: [
            {
              title: 'Menu Utama',
              rows: [
                { title: '✅ Cekin', rowId: 'cekin' },
                { title: '🔥 Streak', rowId: 'streak' },
                { title: '🕒 Runtime', rowId: 'r' }
              ]
            }
          ]
        },
        { quoted: msg }
      );
    }
  } catch (err) {
    console.error('❌ Gagal kirim menu:', err);
    await sock.sendMessage(from, { text: '⚠️ Gagal menampilkan menu.' }, { quoted: msg });
  }
};
