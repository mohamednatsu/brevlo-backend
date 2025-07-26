const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '30d' });
};

// Get Current User
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        userId: user.userId,
        email: user.email,
        name: user.profile?.fullName || user.email.split('@')[0],
        avatar: user.profile?.avatarUrl || null,
        isVerified: user.isVerified,
        remainingRequests: user.profile?.remainingRequests || 0,
        is_pro: user.profile?.isPro || false
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Register User
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        userId: uuidv4(),
        email,
        passwordHash: hashedPassword,
        profile: {
          create: {
            id: uuidv4(),
            fullName: name,
            remainingRequests: 15,
            isPro: false
          }
        }
      },
      select: {
        id: true,
        userId: true,
        email: true,
        isVerified: true,
        profile: true
      }
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to confirm your account.',
      user: {
        id: user.id,
        userId: user.userId,
        email: user.email,
        isVerified: user.isVerified
      },
      token
    });

  } catch (error) {
    if (error.code === 'P2002') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'This email is already registered'
      });
    }

    console.log(error)
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true }
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user.id,
        userId: user.userId,
        email: user.email,
        name: user.profile?.fullName || user.email.split('@')[0],
        avatar: user.profile?.avatarUrl || null,
        isVerified: user.isVerified,
        remainingRequests: user.profile?.remainingRequests || 0,
        is_pro: user.profile?.isPro || false
      },
      token
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Logout User
exports.logout = async (req, res) => {
  try {
    // Client-side should remove the token from storage
    res.status(200).json({ 
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
};