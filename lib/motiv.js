const { CronJob } = require('cron');
const moment = require('moment-timezone');
const { getMotivationFromGemini } = require('./gemini');

const groupId = '120363370128156131@g.us'; // Ganti dengan ID grup kamu

module.exports = function(sock) {
    const job = new CronJob(
        '0 8 * * *', // Jam 08:00 WIB
        async () => {
            console.log(`[${moment().format()}] 🔔 Kirim motivasi pagi...`);

            try {
                const groupMetadata = await sock.groupMetadata(groupId);
                const participants = groupMetadata.participants.map(p => p.id);

                const motivation = await getMotivationFromGemini();
                await sock.sendMessage(groupId, {
                    image: { url: './icon.png' },
                    caption: `📣 *GOOD MORNING, TEAM!* 📣\n\n${motivation}\n\n_Semangat baru untuk hari ini ya guys!_`,
                    mentions: participants
                });

                console.log('✅ Motivasi pagi terkirim.');
            } catch (err) {
                console.error('❌ Gagal kirim motivasi:', err);
            }
        },
        null,
        true,
        'Asia/Jakarta'
    );

    job.start();
};
