const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const repoUrl = 'https://github.com/XenoviaCompany/XenoOS.git';
const currentPath = path.resolve(__dirname, '..');
const tempRepoPath = path.join(currentPath, 'tmp-repo'); // Folder sementara

// Ambil versi dari package.json
function getVersionFromPackageJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return packageJson.version;
}

async function cloneRepoToTemp() {
  if (!fs.existsSync(tempRepoPath)) {
    fs.mkdirSync(tempRepoPath, { recursive: true });
  }

  const git = simpleGit();
  console.log('🔍 Mengecek pembaruan dari repo...');
  await git.clone(repoUrl, tempRepoPath);
}

function copyFiles(src, dest) {
  const exclude = ['.git', 'node_modules', '.gitignore'];

  const files = fs.readdirSync(src);
  for (const file of files) {
    if (exclude.includes(file)) continue;

    const srcFilePath = path.join(src, file);
    const destFilePath = path.join(dest, file);

    if (fs.statSync(srcFilePath).isDirectory()) {
      if (!fs.existsSync(destFilePath)) {
        fs.mkdirSync(destFilePath, { recursive: true });
      }
      copyFiles(srcFilePath, destFilePath);
    } else {
      fs.copyFileSync(srcFilePath, destFilePath);
    }
  }
}

function cleanUpTempRepo() {
  if (fs.existsSync(tempRepoPath)) {
    fs.rmSync(tempRepoPath, { recursive: true, force: true });
  }
}

async function cloneOrUpdateRepo() {
  try {
    if (!process.versions.node) {
      throw new Error('Node.js is not installed. Please install Node.js.');
    }

    const localVer = getVersionFromPackageJson(path.join(currentPath, 'package.json'));

    await cloneRepoToTemp();

    const remoteVer = getVersionFromPackageJson(path.join(tempRepoPath, 'package.json'));

    if (localVer !== remoteVer) {
      console.log(`🚀 Versi baru ditemukan (${localVer} → ${remoteVer}), memperbarui...`);
      copyFiles(tempRepoPath, currentPath);
      console.log('✅ File berhasil diperbarui!');

      // Opsional: restart PM2 otomatis
      if (fs.existsSync('/usr/bin/pm2') || fs.existsSync('/bin/pm2')) {
        try {
          execSync('pm2 restart feyy'); // ganti sesuai nama proses
          console.log('🔁 Bot berhasil direstart via PM2.');
        } catch (e) {
          console.warn('⚠️ Gagal restart PM2:', e.message);
        }
      }
    } else {
      console.log('✅ Bot sudah versi terbaru.');
    }

    cleanUpTempRepo();
  } catch (err) {
    console.error('❌ Gagal saat update:', err.message);
  }
}

module.exports = { cloneOrUpdateRepo };