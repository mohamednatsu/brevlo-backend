const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });



router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/confirm-email', authController.confirmEmail);
router.get('/me', authController.getCurrentUser);

// Google OAuth Routes
router.get('/google', authController.googleAuth); // Initiate Google OAuth flow
router.get('/google/callback', authController.googleCallback); // Handle Google callback
router.get('/google/url', csrfProtection,authController.getGoogleAuthUrl); // Get Google auth URL (alternative)


module.exports = router;
