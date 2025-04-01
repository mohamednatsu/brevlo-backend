const { transcribeAudio } = require('../services/transcriptionService');

exports.transcribe = async (req, res) => {
       try {
              if (!req.file) {
                     return res.status(400).json({ error: 'Audio file is required' });
              }

              const audioFilePath = req.file.path;
              const transcription = await transcribeAudio(audioFilePath);

              if (!transcription) {
                     return res.status(500).json({ error: 'Transcription failed' });
              }

              res.json({
                     success: true,
                     transcription
              });
       } catch (error) {
              console.error('Error in transcription controller:', error);
              res.status(500).json({
                     error: 'Failed to transcribe audio',
                     details: error.message
              });
       }
};