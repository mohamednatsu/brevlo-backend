const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Enhanced error handler
const handleAuthError = (error) => {
  let message = error.message;
  let status = 400;

  // Map specific Supabase errors to user-friendly messages
  if (message.includes('User already registered')) {
    message = 'This email is already registered. Please login instead.';
    status = 409; // Conflict
  } else if (message.includes('Invalid login credentials')) {
    message = 'Invalid email or password. Please try again.';
    status = 401; // Unauthorized
  } else if (message.includes('Email not confirmed')) {
    message = 'Please confirm your email before logging in.';
    status = 403; // Forbidden
  } else if (message.includes('Email rate limit exceeded')) {
    message = 'Too many attempts. Please try again later.';
    status = 429; // Too Many Requests
  }

  return { message, status };
};

// Get Current User
exports.getCurrentUser = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.split(' ')[1];

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required'
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error) throw error;

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: profile?.full_name || user.user_metadata?.name || user.email.split('@')[0],
        avatar: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        isVerified: user.email_confirmed_at !== null,
        remainingRequests: profile?.remaining_requests || 0
      }
    });

  } catch (error) {
    const { message, status } = handleAuthError(error);
    res.status(status).json({
      success: false,
      error: message
    });
  }
};

// Logout User
exports.logout = async (req, res) => {
  try {
    // Extract the access token from the Authorization header
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.split(' ')[1];

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required'
      });
    }

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut(accessToken);
    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    const { message, status } = handleAuthError(error);
    res.status(status).json({
      success: false,
      error: message
    });
  }
};

// Register User and Return Token
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Basic validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/confirm`
      }
    });

    if (error) throw error;

    // Create user profile in your profiles table
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email,
        full_name: name,
        remaining_requests: 15, // Default free requests
        is_pro: false // Free tier by default
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to confirm your account.',
      user: data.user,
      session: data.session,
      access_token: data.session?.access_token
    });

  } catch (error) {
    const { message, status } = handleAuthError(error);
    res.status(status).json({
      success: false,
      error: message
    });
  }
};

// Confirm Email
exports.confirmEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Invalid confirmation token'
      });
    }

    const { data, error } = await supabase.auth.verifyOtp({
      token,
      type: 'email'
    });

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Email confirmed successfully!',
      user: data.user,
      session: data.session,
      access_token: data.session?.access_token
    });

  } catch (error) {
    const { message, status } = handleAuthError(error);
    res.status(status).json({
      success: false,
      error: message
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Get additional profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.full_name || data.user.user_metadata?.name || data.user.email.split('@')[0],
        avatar: profile?.avatar_url || data.user.user_metadata?.avatar_url || null,
        isVerified: data.user.email_confirmed_at !== null,
        remainingRequests: profile?.remaining_requests || 0,
        is_pro: profile?.is_pro || false, // Send Pro status
      },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

  } catch (error) {
    const { message, status } = handleAuthError(error);
    res.status(status).json({
      success: false,
      error: message,
    });
  }
};


// Google OAuth Functions
exports.googleAuth = async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.FRONTEND_URL}/dashboard/upload`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) throw error;
    res.redirect(data.url);
  } catch (error) {
    const { message, status } = handleAuthError(error);
    res.status(status).json({
      success: false,
      error: message
    });
  }
}

exports.googleCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) throw new Error('Authorization code missing');

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;

    // Check if user profile exists, create if not
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!profile) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
        avatar_url: data.user.user_metadata?.avatar_url || null,
        remaining_requests: 10
      });
    }

    // Prepare user data for frontend
    const userData = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
      avatar: data.user.user_metadata?.avatar_url || null,
      isVerified: true,
      remainingRequests: 10
    };

    // Redirect back to auth page with tokens and user data
    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth`);
    redirectUrl.searchParams.set('access_token', data.session.access_token);
    redirectUrl.searchParams.set('refresh_token', data.session.refresh_token);
    redirectUrl.searchParams.set('user', encodeURIComponent(JSON.stringify(userData)));

    res.redirect(redirectUrl.toString());

  } catch (error) {
    const { message } = handleAuthError(error);
    res.redirect(`${process.env.FRONTEND_URL}/auth?error=${encodeURIComponent(message)}`);
  }
};

exports.getGoogleAuthUrl = async (req, res) => {
  try {
    const { redirectTo = `${process.env.FRONTEND_URL}/auth/callback` } = req.query;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });

    if (error) throw error;

    res.json({
      success: true,
      url: data.url
    });

  } catch (error) {
    const { message, status } = handleAuthError(error);
    res.status(status).json({
      success: false,
      error: message
    });
  }
};