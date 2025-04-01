const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

async function downloadYouTubeAudio(videoUrl, outputDirectory = './downloads') {
       // Ensure output directory exists
       if (!fs.existsSync(outputDirectory)) {
              fs.mkdirSync(outputDirectory, { recursive: true });
       }

       return new Promise((resolve, reject) => {
              // Use yt-dlp for more reliable downloads
              const command = `yt-dlp -x --audio-format mp3 -o "${path.join(outputDirectory, '%(title)s.%(ext)s')}" "${videoUrl}"`;

              exec(command, (error, stdout, stderr) => {
                     if (error) {
                            console.error('Download error:', error);
                            reject(error);
                            return;
                     }

                     // Find the generated MP3 file
                     const files = fs.readdirSync(outputDirectory)
                            .filter(file => file.endsWith('.mp3'));

                     if (files.length > 0) {
                            // Return just the filename and type (without path)
                            const fileInfo = {
                                   filename: files[0],
                                   filetype: 'mp3'
                            };
                            console.log(`Audio downloaded: ${fileInfo.filename}`);
                            resolve(fileInfo);
                     } else {
                            reject(new Error('No audio file was created'));
                     }
              });
       });
}


module.exports = { downloadYouTubeAudio };