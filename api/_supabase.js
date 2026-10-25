const { createClient } = require("@supabase/supabase-js");

// Server-side code should use the service role key (set SUPABASE_SERVICE_ROLE_KEY in Vercel).
// It falls back to the anon key so the current deployment keeps working until that's added.
module.exports = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

module.exports.hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
