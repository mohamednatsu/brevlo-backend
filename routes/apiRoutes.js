const express = require('express');
const router = express.Router();
const multer = require('multer');
const summaryController = require('../controllers/summaryController');
const transcriptionController = require('../controllers/transcriptionController');
const youtubeController = require('../controllers/youtubeController.js');
const pdfController = require('../controllers/pdfController');
const checkRequestLimit = require('../middlewares/requestLimit.js');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');


// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'downloads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Apply middleware only to protected routes
router.post('/summarize', checkRequestLimit, summaryController.summarize);
router.post('/transcribe', checkRequestLimit, upload.single('audio'), transcriptionController.transcribe);
router.post('/transcribe/video', checkRequestLimit, upload.single('video'), transcriptionController.transcribe);

// Routes that do NOT require request limits
router.post('/youtube/download', youtubeController.downloadAudio);
router.post('/pdf/generate', pdfController.generateSummaryPDF);
router.post('/summarize/text', summaryController.summarize);

router.post('/save-summary', summaryController.saveSummary);
router.post('/decrease-requests', summaryController.decreaseRequests);



const upload2 = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only video files are allowed.'));
        }
    }
});

// Ensure directories exist
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// ensureDirectoryExists('uploads');
ensureDirectoryExists('../downloads');

router.post('/convert', upload2.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded or invalid file type' });
    }

    const inputPath = req.file.path;
    const outputFilename = `audio-${Date.now()}.mp3`;
    const outputPath = path.join('downloads', outputFilename);

    ffmpeg(inputPath)
        .output(outputPath)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .audioChannels(1) // Mono audio often better for transcription
        .format('mp3')
        .on('start', (commandLine) => {
            console.log('Spawned FFmpeg with command:', commandLine);
        })
        .on('progress', (progress) => {
            console.log(`Processing: ${Math.floor(progress.percent)}% done`);
        })
        .on('end', () => {
            console.log('Conversion finished successfully');

            // Set proper headers for audio file download
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);

            // Stream the file to response
            const fileStream = fs.createReadStream(outputPath);
            fileStream.pipe(res);

            // Cleanup after stream finishes
            fileStream.on('end', () => {
                try {
                    fs.unlinkSync(inputPath);
                    fs.unlinkSync(outputPath);
                    console.log('Temporary files cleaned up');
                } catch (cleanupErr) {
                    console.error('Error during cleanup:', cleanupErr);
                }
            });
        })
        .on('error', (err) => {
            console.error('Conversion error:', err);

            // Attempt cleanup
            try {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (cleanupErr) {
                console.error('Cleanup error:', cleanupErr);
            }

            res.status(500).json({
                error: 'Conversion failed',
                details: err.message
            });
        })
        .run();
});

// Serve downloaded files
router.use('/downloads', express.static('downloads'));

module.exports = router;
