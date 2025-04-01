require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize clients
const supabaseAdmin = createClient(
       process.env.SUPABASE_URL,
       process.env.SUPABASE_SERVICE_ROLE_KEY,
       {
              auth: { autoRefreshToken: false, persistSession: false, flowType: 'pkce' },
       }
);

const supabase = createClient(
       process.env.SUPABASE_URL,
       process.env.SUPABASE_ANON_KEY
);

(async () => {
       try {
              // Test auth.users access (admin only)
              const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
              if (authError) throw authError;
              console.log('Auth users:', authUsers.users.map(u => u.email));

              // Test public.profiles access
              const { data: profiles, error: profilesError } = await supabase
                     .from('profiles')
                     .select('*');

              if (profilesError) throw profilesError;
              console.log('Public profiles:', profiles);

       } catch (error) {
              console.error('Error:', {
                     message: error.message,
                     code: error.code,
                     details: error.details
              });
       }
})();