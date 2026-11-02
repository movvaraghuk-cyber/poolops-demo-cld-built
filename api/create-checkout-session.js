const Stripe = require("stripe");
const supabase = require("./_supabase");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const CARD_FEE_RATE = 0.03;

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
    var body = req.body;
    if (typeof body === "string") body = JSON.parse(body);
    // The secret pay token is what proves the caller may pay this bill; an invoice id alone isn't enough.
    var payToken = body && body.payToken;
    if (!payToken) {
      res.status(400).json({ error: "Missing pay link" });
      return;
    }

    var invoiceRes = await supabase.from("invoices").select("*").eq("pay_token", payToken).single();
    if (invoiceRes.error || !invoiceRes.data) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    var invoice = invoiceRes.data;
    if (invoice.status === "paid") {
      res.status(400).json({ error: "This invoice is already paid" });
      return;
    }

    // The client picks how to pay, so the card fee is worked out here rather than when the bill is sent.
    var method = body.method === "card" ? "card" : "ach";
    var subtotal = Math.round(Number(invoice.subtotal) * 100) / 100;
    var surcharge = method === "card" ? Math.round(subtotal * CARD_FEE_RATE * 100) / 100 : 0;
    var total = Math.round((subtotal + surcharge) * 100) / 100;

    var updateRes = await supabase.from("invoices").update({ pay_method: method, surcharge: surcharge, total: total }).eq("id", invoice.id);
    if (updateRes.error) throw updateRes.error;

    var clientRes = await supabase.from("clients").select("*").eq("id", invoice.client_id).single();
    var client = clientRes.data;

    var origin = req.headers.origin || ("https://" + req.headers.host);
    var back = origin + "/?pay=" + encodeURIComponent(invoice.pay_token);

    var lineItems = [{
      price_data: {
        currency: "usd",
        product_data: { name: "ServiceOps invoice — " + (client ? client.name : invoice.client_id) },
        unit_amount: Math.round(subtotal * 100)
      },
      quantity: 1
    }];
    if (surcharge) {
      lineItems.push({
        price_data: { currency: "usd", product_data: { name: "Card fee (3%)" }, unit_amount: Math.round(surcharge * 100) },
        quantity: 1
      });
    }

    var session = await stripe.checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: method === "card" ? ["card"] : ["us_bank_account"],
      customer_email: client && client.email ? client.email : undefined,
      line_items: lineItems,
      metadata: { invoice_id: invoice.id },
      success_url: back + "&paid=success",
      cancel_url: back + "&paid=cancelled"
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
