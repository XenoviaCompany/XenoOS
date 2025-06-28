const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

const CHECKIN_PATH = path.join(__dirname, 'data', 'checkin.json');

if (!fs.existsSync(path.dirname(CHECKIN_PATH)))
    fs.mkdirSync(path.dirname(CHECKIN_PATH));

if (!fs.existsSync(CHECKIN_PATH))
    fs.writeFileSync(CHECKIN_PATH, '{}');

const loadCheckin = () => JSON.parse(fs.readFileSync(CHECKIN_PATH));
const saveCheckin = (data) => fs.writeFileSync(CHECKIN_PATH, JSON.stringify(data, null, 2));


// ✅ Fungsi check-in harian
function checkIn(userId) {
    const db = loadCheckin();
    const today = moment().tz('Asia/Jakarta').format('YYYY-MM-DD');

    if (!db[userId])
        db[userId] = { checkins: [] };

    if (db[userId].checkins.includes(today))
        return `LU UDAH CHECKIN KONTOL`;

    db[userId].checkins.push(today);
    saveCheckin(db);

    return `✅ Check-in berhasil untuk ${today}!`;
}


// 🔥 Hitung streak harian berturut-turut
function getStreak(userId) {
    const db = loadCheckin();
    const list = db[userId]?.checkins || [];

    if (list.length === 0)
        return `😴 Belum ada check-in.`;

    const sorted = [...list].sort();
    let streak = 0;
    let today = moment().tz('Asia/Jakarta');

    for (let i = sorted.length - 1; i >= 0; i--) {
        const date = moment(sorted[i]);
        const diff = today.diff(date, 'days');

        if (diff === 0 || diff === 1) {
            streak++;
            today = date;
        } else break;
    }

    return `🔥 Streak kamu: *${streak} hari berturut-turut!*`;
}


// ❗ Reminder user yang absen lebih dari 1 hari
function getAbsentUsers() {
    const db = loadCheckin();
    const now = moment().tz('Asia/Jakarta');
    const reminders = [];

    for (const [userId, data] of Object.entries(db)) {
        const list = data.checkins || [];

        if (list.length === 0) {
            reminders.push({
                userId,
                message: `📛 @${userId.split('@')[0]} belum pernah check-in!`
            });
            continue;
        }

        const last = moment(list[list.length - 1]);
        const diff = now.diff(last, 'days');

        if (diff >= 1) {
            reminders.push({
                userId,
                message: `👀 @${userId.split('@')[0]}, kamu belum check-in selama ${diff} hari! Yuk semangat lagi hari ini!`,
                mentions: [userId]
            });
        }
    }

    return reminders;
}

module.exports = {
    checkIn,
    getStreak,
    getAbsentUsers
};