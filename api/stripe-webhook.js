const Stripe = require("stripe");
const supabase = require("./_supabase");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const PHOTO_KEEP_DAYS = 30;

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
        var paidAt = new Date();
        var result = await supabase.from("invoices").update({
          status: "paid",
          paid_at: paidAt.toISOString(),
          // Job photos are deleted this long after payment by api/cleanup-photos.js.
          photos_expire_at: new Date(paidAt.getTime() + PHOTO_KEEP_DAYS * 86400000).toISOString()
        }).eq("id", invoiceId);
        if (result.error) {
          // A non-2xx response makes Stripe retry the webhook later.
          console.error("Couldn't mark invoice paid", invoiceId, result.error);
          res.status(500).json({ error: "Database update failed" });
          return;
        }
      }
    }
  }

  res.status(200).json({ received: true });
};
