const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function setupFFmpeg() {
  console.log('🎵 Setting up FFmpeg...');
  
  // Check if we're on Linux
  const isLinux = process.platform === 'linux';
  
  if (isLinux) {
    try {
      console.log('📦 Installing FFmpeg using apt...');
      execSync('sudo apt-get update');
      execSync('sudo apt-get install -y ffmpeg');
      console.log('✅ FFmpeg setup complete! The bot is ready to play music.');
    } catch (error) {
      console.error('❌ Error installing FFmpeg:', error.message);
      process.exit(1);
    }
  } else {
    // Windows setup code
    const https = require('https');
    const AdmZip = require('adm-zip');
    
    const ffmpegPath = path.join(__dirname, 'ffmpeg');
    if (!fs.existsSync(ffmpegPath)) {
      fs.mkdirSync(ffmpegPath);
    }

    const zipPath = path.join(ffmpegPath, 'ffmpeg.zip');
    
    try {
      // Download FFmpeg
      console.log('📥 Downloading FFmpeg...');
      await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(zipPath);
        https.get('https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip', response => {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', err => {
          fs.unlink(zipPath, () => {});
          reject(err);
        });
      });

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
}

setupFFmpeg(); 