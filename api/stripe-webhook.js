const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports.config = { api: { bodyParser: false } };

function buffer(readable) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    readable.on("data", function (chunk) { chunks.push(chunk); });
    readable.on("end", function () { resolve(Buffer.concat(chunks)); });
    readable.on("error", reject);
  });
}

module.exports = async (req, res) => {
  var sig = req.headers["stripe-signature"];
  var event;

  try {
    var buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    res.status(400).send("Webhook signature verification failed: " + err.message);
    return;
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    var session = event.data.object;
    if (session.payment_status === "paid") {
      var invoiceId = session.metadata && session.metadata.invoice_id;
      if (invoiceId) {
        await supabase.from("invoices").update({
          status: "paid",
          paid_at: new Date().toISOString()
        }).eq("id", invoiceId);
      }
    }
  }

  res.status(200).json({ received: true });
};
