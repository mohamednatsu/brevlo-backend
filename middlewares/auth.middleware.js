const { supabase } = require('../utils/supabaseClient');
const { error } = require('../utils/response');

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return error(res, 'Authentication token is required', 401);
  }

  try {
    const { data: { user }, error: supabaseError } = await supabase.auth.getUser(token);
    
    if (supabaseError) throw supabaseError;
    if (!user) throw new Error('Invalid user');

    req.user = user;
    next();
  } catch (err) {
    return error(res, err.message, 401);
  }
};

module.exports = { authenticate };