// Creates (or updates) the ServiceOps logins in Supabase Auth plus their profiles rows.
// Run after supabase/migrations/20261026_auth_rls.sql:
//
//   npm install
//   SUPABASE_URL=https://<project>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<key> DEMO_PASSWORD=<at least 8 chars> \
//     node scripts/create-users.js
//
// People log in with the username (e.g. "owner"); the app turns it into username@LOGIN_EMAIL_DOMAIN.
// Keep LOGIN_EMAIL_DOMAIN in sync with the same constant in index.html.

const { createClient } = require("@supabase/supabase-js");

const LOGIN_EMAIL_DOMAIN = "serviceops.test";

const USERS = [
  { username: "owner", role: "manager", displayName: "Owner" },
  { username: "manager", role: "manager", displayName: "Manager" },
  { username: "contractor1", role: "contractor", displayName: "Contractor 1" },
  { username: "customer1", role: "client", displayName: "Maria Chen", clientId: "c1" },
  { username: "customer2", role: "client", displayName: "Robert Diaz", clientId: "c2" },
  { username: "customer3", role: "client", displayName: "Aiko Tanaka", clientId: "c3" },
  { username: "customer4", role: "client", displayName: "The Nguyen Family", clientId: "c4" }
];

async function main() {
  var url = process.env.SUPABASE_URL;
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  var password = process.env.DEMO_PASSWORD;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  if (!password || password.length < 8) throw new Error("Set DEMO_PASSWORD (at least 8 characters)");

  var sb = createClient(url, key, { auth: { persistSession: false } });

  var existing = {};
  var listRes = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (listRes.error) throw listRes.error;
  listRes.data.users.forEach(function (u) { existing[(u.email || "").toLowerCase()] = u; });

  for (var i = 0; i < USERS.length; i++) {
    var u = USERS[i];
    var email = u.username + "@" + LOGIN_EMAIL_DOMAIN;
    var authUser = existing[email];
    if (authUser) {
      var upd = await sb.auth.admin.updateUserById(authUser.id, { password: password });
      if (upd.error) throw upd.error;
    } else {
      var created = await sb.auth.admin.createUser({ email: email, password: password, email_confirm: true });
      if (created.error) throw created.error;
      authUser = created.data.user;
    }
    var prof = await sb.from("profiles").upsert({
      id: authUser.id, username: u.username, role: u.role, display_name: u.displayName, client_id: u.clientId || null
    });
    if (prof.error) throw prof.error;
    console.log((existing[email] ? "updated " : "created ") + u.username + " (" + u.role + ")");
  }
  console.log("Done. Log in with any username above and DEMO_PASSWORD.");
}

main().catch(function (err) {
  console.error("Failed:", err.message || err);
  process.exit(1);
});
