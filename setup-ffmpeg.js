const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { pipeline } = require('stream/promises');
const AdmZip = require('adm-zip');

async function downloadFile(url, dest) {
  const file = fs.createWriteStream(dest);
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function setupFFmpeg() {
  console.log('🎵 Setting up FFmpeg...');
  
  const ffmpegPath = path.join(__dirname, 'ffmpeg');
  if (!fs.existsSync(ffmpegPath)) {
    fs.mkdirSync(ffmpegPath);
  }

  const zipPath = path.join(ffmpegPath, 'ffmpeg.zip');
  
  try {
    // Download FFmpeg
    console.log('📥 Downloading FFmpeg...');
    await downloadFile(
      'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
      zipPath
    );

    // Extract the zip
    console.log('📦 Extracting FFmpeg...');
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(ffmpegPath, true);

    // Move the executables to the right place
    const ffmpegBinPath = path.join(ffmpegPath, 'ffmpeg-master-latest-win64-gpl', 'bin');
    const exeFiles = ['ffmpeg.exe', 'ffplay.exe', 'ffprobe.exe'];
    
    for (const exe of exeFiles) {
      const sourcePath = path.join(ffmpegBinPath, exe);
      const destPath = path.join(ffmpegPath, exe);
      if (fs.existsSync(sourcePath)) {
        fs.renameSync(sourcePath, destPath);
      }
    }

    // Clean up
    fs.rmSync(zipPath);
    fs.rmSync(path.join(ffmpegPath, 'ffmpeg-master-latest-win64-gpl'), { recursive: true, force: true });

    console.log('✅ FFmpeg setup complete! The bot is ready to play music.');
  } catch (error) {
    console.error('❌ Error setting up FFmpeg:', error);
    process.exit(1);
  }
}

setupFFmpeg(); 