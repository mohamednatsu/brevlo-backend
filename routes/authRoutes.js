const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });



router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
// router.get('/confirm-email', authController.confirmEmail);
router.get('/me', authController.getCurrentUser);

module.exports = router;
