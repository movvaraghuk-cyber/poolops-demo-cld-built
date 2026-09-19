const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    var body = req.body;
    if (typeof body === "string") body = JSON.parse(body);
    var invoiceId = body && body.invoiceId;
    if (!invoiceId) {
      res.status(400).json({ error: "Missing invoiceId" });
      return;
    }

    var invoiceRes = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
    if (invoiceRes.error || !invoiceRes.data) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    var invoice = invoiceRes.data;
    if (invoice.status === "paid") {
      res.status(400).json({ error: "This invoice is already paid" });
      return;
    }

    var clientRes = await supabase.from("clients").select("*").eq("id", invoice.client_id).single();
    var client = clientRes.data;

    var paymentMethodTypes = invoice.pay_method === "card" ? ["card"] : ["us_bank_account"];
    var origin = req.headers.origin || ("https://" + req.headers.host);

    var session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethodTypes,
      customer_email: client ? client.email : undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "ServiceOps invoice — " + (client ? client.name : invoice.client_id) },
            unit_amount: Math.round(Number(invoice.total) * 100)
          },
          quantity: 1
        }
      ],
      metadata: { invoice_id: invoice.id },
      success_url: origin + "/?paid=success",
      cancel_url: origin + "/?paid=cancelled"
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
