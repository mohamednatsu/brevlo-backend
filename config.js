require("dotenv").config();

module.exports = {
       ASSEMBLYAI_API_KEY: process.env.assemplyai_key,
       GROQ_API_KEY: process.env.GROQ_API_KEY,
       session: {
              secret: process.env.SESSION_SECRET || 'your-secret-key',
              maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
       },
       supabase: {
              url: process.env.SUPABASE_URL,
              anonKey: process.env.SUPABASE_ANON_KEY,
              serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
       },
};


