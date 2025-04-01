const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const checkRequestLimit = async (req, res, next) => {
       try {
              // Skip middleware for OPTIONS requests (preflight)
              if (req.method === 'OPTIONS') {
                     return next();
              }

              // 1. Extract Authorization header
              const authHeader = req.headers['authorization'];
              if (!authHeader) {
                     return res.status(401).json({ success: false, error: 'Authorization header missing', code: 'missing_auth_header' });
              }

              // 2. Validate Bearer token format
              const [bearer, token] = authHeader.split(' ');
              if (bearer !== 'Bearer' || !token) {
                     return res.status(401).json({ success: false, error: 'Invalid Authorization format. Expected: Bearer <token>', code: 'invalid_auth_format' });
              }

              // 3. Verify token with Supabase
              const { data, error } = await supabase.auth.getUser(token);
              if (error || !data.user) {
                     return res.status(401).json({ success: false, error: 'Invalid or expired token', code: 'invalid_token' });
              }
              const user = data.user;

              // 4. Get user profile
              const { data: profile, error: profileError } = await supabase
                     .from('profiles')
                     .select('remaining_requests, is_pro')
                     .eq('id', user.id)
                     .single();

              if (profileError || !profile) {
                     return res.status(500).json({ success: false, error: 'Failed to fetch user profile', code: 'profile_fetch_error' });
              }

              // 5. Check if user is Pro (unlimited requests)
              if (profile.is_pro) {
                     req.user = { id: user.id, is_pro: true }; // Attach user data to request
                     return next();
              }

              // 6. Check remaining requests for free users
              if (profile.remaining_requests <= 0) {
                     return res.status(403).json({ success: false, error: 'You have used all free requests. Upgrade to Pro to continue.', code: 'limit_exceeded' });
              }

              // 7. Deduct request count for specific routes
              if (['/summarize', '/transcribe'].includes(req.path)) {
                     await supabase
                            .from('profiles')
                            .update({ remaining_requests: profile.remaining_requests - 1 })
                            .eq('id', user.id);
              }

              req.user = { id: user.id, is_pro: false, remaining_requests: profile.remaining_requests - 1 };
              next();
       } catch (error) {
              console.error('Middleware error:', error);
              res.status(500).json({ success: false, error: 'Internal server error', code: 'internal_error' });
       }
};

module.exports = checkRequestLimit;
