const { createClient } = require("@supabase/supabase-js");

// Server-side code uses the service role key (set SUPABASE_SERVICE_ROLE_KEY in Vercel).
// Row level security is on, so the anon key fallback can't read any data; it's only here so
// the functions load and report the missing key instead of crashing.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

module.exports = supabase;

module.exports.hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

// Who is calling, from the "Authorization: Bearer <access token>" the app sends.
// Returns their profiles row ({ username, role, ... }) or null if not logged in.
module.exports.callerProfile = async function (req) {
  var header = req.headers.authorization || "";
  var jwt = header.indexOf("Bearer ") === 0 ? header.slice(7) : "";
  if (!jwt) return null;
  var userRes = await supabase.auth.getUser(jwt);
  if (userRes.error || !userRes.data || !userRes.data.user) return null;
  var profileRes = await supabase.from("profiles").select("*").eq("id", userRes.data.user.id).maybeSingle();
  return profileRes.data || null;
};
