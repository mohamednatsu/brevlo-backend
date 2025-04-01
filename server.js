const express = require('express');
const bodyParser = require('body-parser');
const apiRoutes = require('./routes/apiRoutes');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const app = express();
app.use(morgan('dev'));

const corsOptions = {
       origin: process.env.FRONTEND_URL || 'http://localhost:3000',
       credentials: true,
       allowedHeaders: ['Content-Type', 'Authorization'],
       methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}

app.use(cors(corsOptions))
app.use(express.static('public')); // Serve static files
// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure directories exist
const fs = require('fs');
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
       fs.mkdirSync(downloadsDir, { recursive: true });
}

// Routes
app.use('/api', apiRoutes);
app.use('/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
       console.error(err.stack);
       res.status(500).json({
              success: false,
              error: 'Something went wrong!'
       });
});

// Route to show confirmation page
app.get('/confirm-email-page', (req, res) => {
       res.sendFile(path.join(__dirname, 'public', 'confirm-email.html'));
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
       console.log(`Server running on port ${PORT}`);
});