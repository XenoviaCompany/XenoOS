module.exports = async function sendMenuButtons(sock, msg) {
  const from = msg.key.remoteJid;

  const menuText = `
╭───〔 *XenoviaAI Menu* 〕
│ 👋 Selamat datang!
│ Tombol ini belum aktif semua ya...
╰──〔 ⚡ Xenovia Holdings Ltd. 〕`.trim();

  try {
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
  } catch (err) {
    console.error('❌ Gagal kirim tombol:', err);
    await sock.sendMessage(from, { text: '⚠️ Gagal menampilkan tombol.' }, { quoted: msg });
  }
};
