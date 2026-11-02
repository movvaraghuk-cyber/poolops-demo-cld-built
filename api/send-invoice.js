const supabase = require("./_supabase");

// Texts and/or emails a client their pay link.
// SMS uses Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER).
// Email uses Resend (RESEND_API_KEY, INVOICE_FROM_EMAIL).
// A channel without keys reports "not_configured" and the app falls back to the owner's own phone.

const BUSINESS_NAME = process.env.BUSINESS_NAME || "ServiceOps";

const SERVICE_LABELS = {
  poolClean: "pool clean", chemBalance: "chemical balance", equipCheck: "equipment check",
  pumpReplace: "pump replacement", filterCleaning: "filter cleaning", leakDetection: "leak detection",
  greenToClean: "green-to-clean treatment", deckCleaning: "tile & deck cleaning",
  saltCellReplace: "salt cell replacement", heaterInspect: "heater inspection",
  poolOpening: "seasonal pool opening", poolClosing: "seasonal pool closing"
};

function toE164(phone) {
  var raw = String(phone || "").trim();
  var digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return "+" + digits;
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits[0] === "1") return "+" + digits;
  return null;
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

async function sendSms(to, body) {
  var sid = process.env.TWILIO_ACCOUNT_SID;
  var auth = process.env.TWILIO_AUTH_TOKEN;
  var from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !auth || !from) return "not_configured";
  var number = toE164(to);
  if (!number) return "bad_number";
  var r = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Messages.json", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(sid + ":" + auth).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ To: number, From: from, Body: body }).toString()
  });
  if (!r.ok) console.error("Twilio error", r.status, await r.text());
  return r.ok ? "sent" : "failed";
}

async function sendEmail(to, subject, text, html) {
  var key = process.env.RESEND_API_KEY;
  var from = process.env.INVOICE_FROM_EMAIL;
  if (!key || !from) return "not_configured";
  var r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from: from, to: [to], subject: subject, text: text, html: html })
  });
  if (!r.ok) console.error("Resend error", r.status, await r.text());
  return r.ok ? "sent" : "failed";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!supabase.hasServiceRole) {
    res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" });
    return;
  }

  try {
    // Only the office can text or email clients.
    var caller = await supabase.callerProfile(req);
    if (!caller || caller.role !== "manager") {
      res.status(401).json({ error: "Log in as the owner or a manager to send bills" });
      return;
    }

    var body = req.body;
    if (typeof body === "string") body = JSON.parse(body);
    var invoiceId = body && body.invoiceId;
    var channels = (body && Array.isArray(body.channels) ? body.channels : []).filter(function (c) {
      return c === "sms" || c === "email";
    });
    if (!invoiceId || !channels.length) {
      res.status(400).json({ error: "Missing invoiceId or channels" });
      return;
    }

    var invoiceRes = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
    if (invoiceRes.error || !invoiceRes.data) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    var invoice = invoiceRes.data;
    if (!invoice.pay_token) {
      res.status(400).json({ error: "Invoice has no pay link. Run the latest database migration." });
      return;
    }

    var clientRes = await supabase.from("clients").select("*").eq("id", invoice.client_id).single();
    var client = clientRes.data || {};
    var jobsRes = await supabase.from("jobs").select("service_type").in("id", invoice.job_ids || []);
    var what = (jobsRes.data || []).map(function (j) { return SERVICE_LABELS[j.service_type] || j.service_type; }).join(", ") || "service";

    var origin = process.env.PUBLIC_APP_URL || req.headers.origin || ("https://" + req.headers.host);
    var link = origin.replace(/\/$/, "") + "/?pay=" + encodeURIComponent(invoice.pay_token);
    var amount = "$" + Number(invoice.subtotal).toFixed(2);
    var first = String(client.name || "").split(" ")[0] || "there";
    var text = "Hi " + first + ", your " + what + " at " + (client.address || "your property") + " is done. " +
      "See the photos and pay " + amount + " here: " + link + " - " + BUSINESS_NAME;

    var results = {};
    for (var i = 0; i < channels.length; i++) {
      var channel = channels[i];
      try {
        if (channel === "sms") {
          results.sms = client.phone ? await sendSms(client.phone, text) : "no_contact";
        } else {
          var html = "<p>Hi " + escapeHtml(first) + ",</p>" +
            "<p>Your " + escapeHtml(what) + " at " + escapeHtml(client.address || "your property") + " is done.</p>" +
            '<p><a href="' + escapeHtml(link) + '">See the photos and pay ' + amount + "</a></p>" +
            "<p>" + escapeHtml(BUSINESS_NAME) + "</p>";
          results.email = client.email ? await sendEmail(client.email, "Your bill from " + BUSINESS_NAME + ": " + amount, text, html) : "no_contact";
        }
      } catch (err) {
        console.error(channel + " send failed", err);
        results[channel] = "failed";
      }
    }

    var sent = Object.keys(results).filter(function (c) { return results[c] === "sent"; });
    if (sent.length) {
      var already = invoice.sent_via || [];
      var merged = already.concat(sent.filter(function (c) { return already.indexOf(c) === -1; }));
      await supabase.from("invoices").update({ sent_via: merged }).eq("id", invoice.id);
    }

    res.status(200).json({ results: results, link: link });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
