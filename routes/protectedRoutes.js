const express = require('express');
const router = express.Router();
const checkRequestLimit = require('../middleware/requestLimit');

// Apply middleware to all routes in this file
router.use(checkRequestLimit);

// Example protected API endpoint
router.post('/summarize', async (req, res) => {
       try {
              // Access user data from middleware
              const userId = req.user.id;
              const isPro = req.user.isPro;
              const remainingRequests = req.user.remainingRequests;

              // Your business logic here
              const summary = await generateSummary(req.body.text);

              res.json({
                     success: true,
                     summary,
                     meta: {
                            userId,
                            isPro,
                            remainingRequests
                     }
              });
       } catch (error) {
              console.error('Summarization error:', error);
              res.status(500).json({
                     success: false,
                     error: 'Failed to generate summary'
              });
       }
});

module.exports = router;