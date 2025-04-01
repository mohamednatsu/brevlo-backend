
const ytdl = require("ytdl-core");
const { downloadYouTubeAudio } = require('../services/youtubeService');

exports.downloadAudio = async (req, res) => {
       try {
              const { videoUrl } = req.body;

              if (!videoUrl) {
                     return res.status(400).json({
                            success: false,
                            error: 'YouTube video URL is required'
                     });
              }

              // Validate YouTube URL
              if (!ytdl.validateURL(videoUrl)) {
                     return res.status(400).json({
                            success: false,
                            error: 'Invalid YouTube URL'
                     });
              }

              const audioFile = await downloadYouTubeAudio(videoUrl);

              res.json({
                     success: true,
                     message: 'Audio downloaded successfully',
                     file: audioFile
              });
       } catch (error) {
              console.error('Error in YouTube download controller:', error);
              res.status(500).json({
                     success: false,
                     error: 'Failed to download YouTube audio',
                     details: error.message
              });
       }
};