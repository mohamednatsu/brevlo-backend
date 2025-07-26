const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const pool = new Pool({
       connectionString: process.env.NEON_POSTGRES_URL,
       ssl: true
});

const checkRequestLimit = async (req, res, next) => {
       try {
              // Skip middleware for OPTIONS requests (preflight)
              if (req.method === 'OPTIONS') {
                     return next();
              }

              // 1. Extract Authorization header
              const authHeader = req.headers['authorization'];
              if (!authHeader) {
                     return res.status(401).json({
                            success: false,
                            error: 'Authorization header missing',
                            code: 'missing_auth_header'
                     });
              }

              // 2. Validate Bearer token format
              const [bearer, token] = authHeader.split(' ');
              if (bearer !== 'Bearer' || !token) {
                     return res.status(401).json({
                            success: false,
                            error: 'Invalid Authorization format. Expected: Bearer <token>',
                            code: 'invalid_auth_format'
                     });
              }

              // 3. Verify JWT token
              let userId;
              try {
                     const decoded = jwt.verify(token, process.env.JWT_SECRET);
                     userId = decoded.id;
              } catch (err) {
                     return res.status(401).json({
                            success: false,
                            error: 'Invalid or expired token',
                            code: 'invalid_token'
                     });
              }

              // 4. Get user profile from PostgreSQL
              const profileQuery = await pool.query(
                     `SELECT u.id, p.remaining_requests, p.is_pro 
       FROM users u
       JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
                     [userId]
              );

              if (profileQuery.rows.length === 0) {
                     return res.status(404).json({
                            success: false,
                            error: 'User profile not found',
                            code: 'profile_not_found'
                     });
              }

              const profile = profileQuery.rows[0];

              // 5. Check if user is Pro (unlimited requests)
              if (profile.is_pro) {
                     req.user = {
                            id: profile.id,
                            is_pro: true
                     };
                     return next();
              }

              // 6. Check remaining requests for free users
              if (profile.remaining_requests <= 0) {
                     return res.status(403).json({
                            success: false,
                            error: 'You have used all free requests. Upgrade to Pro to continue.',
                            code: 'limit_exceeded'
                     });
              }

              // 7. Deduct request count for specific routes
              if (['/summarize', '/transcribe'].includes(req.path)) {
                     await pool.query(
                            `UPDATE profiles 
         SET remaining_requests = remaining_requests - 1 
         WHERE user_id = $1`,
                            [userId]
                     );
              }

              req.user = {
                     id: profile.id,
                     is_pro: false,
                     remaining_requests: profile.remaining_requests - 1
              };
              next();
       } catch (error) {
              console.error('Middleware error:', error);
              res.status(500).json({
                     success: false,
                     error: 'Internal server error',
                     code: 'internal_error'
              });
       }
};

module.exports = checkRequestLimit;