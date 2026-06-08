import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!
);

export async function POST(req: Request) {
  try {
    const { plan } = await req.json();
    const priceMap = {
  go: process.env.STRIPE_GO_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
  builder: process.env.STRIPE_BUILDER_PRICE_ID,
};
console.log("PLAN REQUESTED:", plan);

const selectedPrice =
  priceMap[plan as keyof typeof priceMap];

if (!selectedPrice) {
  return Response.json(
    { error: "Invalid plan" },
    { status: 400 }
  );
}
    console.log(
      "SECRET KEY:",
      process.env.STRIPE_SECRET_KEY?.slice(0, 15)
    );

    console.log("PLAN:", plan);
console.log("PRICE:", selectedPrice);

    const session =
  await stripe.checkout.sessions.create({
    mode: "subscription",

    metadata: {
      plan,
    },

    line_items: [
      {
        price: selectedPrice,
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