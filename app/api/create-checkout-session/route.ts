import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!
);

export async function POST() {
  try {
    console.log(
      "SECRET KEY:",
      process.env.STRIPE_SECRET_KEY?.slice(0, 15)
    );

    console.log(
      "PRICE ID:",
      process.env.STRIPE_PRICE_ID
    );

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",

        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID!,
            quantity: 1,
          },
        ],

        success_url:
          "http://localhost:3000/success",

        cancel_url:
          "http://localhost:3000",
      });

    return Response.json({
      url: session.url,
    });

  } catch (error: any) {

    console.log("========== STRIPE ERROR ==========");
    console.log(error);
    console.log("MESSAGE:", error?.message);
    console.log("TYPE:", error?.type);
    console.log("=================================");

    return Response.json(
      {
        error: error?.message || "Failed",
      },
      { status: 500 }
    );
  }
}