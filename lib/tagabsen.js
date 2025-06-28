const { CronJob } = require('cron');
const moment = require('moment-timezone');
const { getAbsentUsers } = require('./checkin');

const groupId = '120363370128156131@g.us';

module.exports = function(sock) {
    const job = new CronJob(
        '0 10 * * *', // Jam 10:00 WIB
        async () => {
            console.log(`[${moment().format()}] 🔎 Cek siapa yang belum check-in...`);

            try {
                const groupMetadata = await sock.groupMetadata(groupId);
                const participants = groupMetadata.participants.map(p => p.id);

                const absentUsers = getAbsentUsers(participants);
                for (const reminder of absentUsers) {
                    await sock.sendMessage(groupId, {
                        text: reminder.message,
                        mentions: reminder.mentions
                    });
                }

                console.log('✅ Tag absen selesai.');
            } catch (err) {
                console.error('❌ Gagal kirim tag absen:', err);
            }
        },
        null,
        true,
        'Asia/Jakarta'
    );

    job.start();
};
