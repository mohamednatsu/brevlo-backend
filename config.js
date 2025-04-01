require("dotenv").config();

module.exports = {
       ASSEMBLYAI_API_KEY: "138c0e246e0d41919d97e4b7ae8608a0",
       GROQ_API_KEY: "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",
       AUDIO_FILE_PATH: "./audio.mp3",
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
