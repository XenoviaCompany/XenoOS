const ytSearch = require('yt-search');
const ytdlp = require('yt-dlp-exec');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

const cookiesPath = path.join(__dirname, 'cookies.txt'); // pastikan file ini ada

/**
 * Download, kompres MP3 dan return Buffer + thumbnail
 */
async function downloadMp3(query, filename = 'audio') {
  try {
    const search = await ytSearch(query);
    const video = search.videos[0];
    if (!video) throw new Error('Video tidak ditemukan!');

    const tempFile = path.join(tmpDir, `${filename}.mp4`);
    const outputFile = path.join(tmpDir, `${filename}.mp3`);

    // Download audio-only
    await ytdlp(video.url, {
      output: tempFile,
      format: 'bestaudio[ext=mp4]/bestaudio',
      cookies: cookiesPath,
    });

    // Convert ke MP3
    await new Promise((resolve, reject) => {
      ffmpeg(tempFile)
        .audioBitrate('128k')
        .toFormat('mp3')
        .save(outputFile)
        .on('end', resolve)
        .on('error', reject);
    });

    const buffer = fs.readFileSync(outputFile);

    // Cleanup
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

    return {
      title: video.title,
      duration: video.timestamp,
      buffer,
      thumbnail: video.thumbnail // ditambahkan thumbnail
    };
  } catch (err) {
    console.error('Gagal download MP3:', err);
    throw err;
  }
}

/**
 * Download, kompres MP4 dan return Buffer + thumbnail
 */
async function downloadMp4(query, filename = 'video') {
  try {
    const search = await ytSearch(query);
    const video = search.videos[0];
    if (!video) throw new Error('Video tidak ditemukan!');

    const tempFile = path.join(tmpDir, `${filename}_raw.mp4`);
    const outputFile = path.join(tmpDir, `${filename}.mp4`);

    await ytdlp(video.url, {
      output: tempFile,
      format: 'bestvideo+bestaudio/best',
      cookies: cookiesPath,
    });

    await new Promise((resolve, reject) => {
      ffmpeg(tempFile)
        .videoBitrate('800k')
        .audioBitrate('128k')
        .save(outputFile)
        .on('end', resolve)
        .on('error', reject);
    });

    const buffer = fs.readFileSync(outputFile);

    // Cleanup
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

    return {
      title: video.title,
      duration: video.timestamp,
      buffer,
      thumbnail: video.thumbnail // ditambahkan thumbnail
    };
  } catch (err) {
    console.error('Gagal download MP4:', err);
    throw err;
  }
}

module.exports = { downloadMp3, downloadMp4 };
