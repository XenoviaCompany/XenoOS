const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const ELEVENLABS_API_KEY = 'sk_77607cbfb79d9dbf84fb29c9018e004e564ac349781ddc47';
const VOICE_ID = 'XJa38TJgDqYhj5mYbSJA'; // Bella
const TEMP_DIR = './tmp';
const TEMP_MP3 = path.join(TEMP_DIR, 'hasil.mp3');
const TEMP_OPUS = path.join(TEMP_DIR, 'hasil.opus');

async function kirimVN(sock, msg, teks = 'halo') {
  try {
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        text: teks,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style_exaggeration: 0.3
        }
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer'
      }
    );

    fs.writeFileSync(TEMP_MP3, response.data);

    const stats = fs.statSync(TEMP_MP3);
    if (stats.size < 1000) throw new Error('❌ File MP3 terlalu kecil atau gagal diunduh');

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-y', '-i', TEMP_MP3,
        '-c:a', 'libopus',
        '-b:a', '128k',
        TEMP_OPUS
      ]);

      ffmpeg.stderr.on('data', d => console.log(d.toString()));
      ffmpeg.on('close', code => {
        if (code === 0) resolve();
        else reject('❌ ffmpeg gagal convert MP3 ke OPUS');
      });
    });

    // Hapus file MP3 saja
    fs.unlinkSync(TEMP_MP3);

    await sock.sendMessage(msg.key.remoteJid, {
      audio: fs.readFileSync(TEMP_OPUS),
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true
    }, { quoted: msg });

    console.log(`✅ Voice note tersimpan di ${TEMP_OPUS}`);

  } catch (err) {
    console.error('❌ kirimVN (elevenlabs) error:', err.response?.data || err.message);
  }
}

module.exports = kirimVN;
