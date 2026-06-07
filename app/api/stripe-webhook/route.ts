import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const event = JSON.parse(body);

    console.log("EVENT TYPE:", event.type);

    if (event.type !== "checkout.session.completed") {
      return new Response("ignored");
    }

    const session = event.data.object;

    console.log("INSIDE CHECKOUT SESSION");

    console.log(
      "EMAIL:",
      session.customer_details?.email
    );

    console.log(
      "CUSTOMER:",
      session.customer
    );

    console.log(
      "SUBSCRIPTION:",
      session.subscription
    );

    const email =
      session.customer_details?.email;

    const { data: authUsers } =
      await supabase.auth.admin.listUsers();

    const user = authUsers.users.find(
      (u) =>
        u.email?.toLowerCase() ===
        email?.toLowerCase()
    );

    console.log(
      "FOUND USER:",
      user?.id
    );

    const { error } = await supabase
  .from("subscriptions")
  .upsert(
    {
      user_id: user?.id ?? null,
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      plan: "Pro",
      status: "active",
    },
    {
      onConflict: "stripe_subscription_id",
    }
  );

    console.log(
      "SUPABASE ERROR:",
      error
    );

    return new Response("ok");
  } catch (error) {
    console.error(
      "WEBHOOK ERROR:",
      error
    );

    return new Response(
      JSON.stringify({
        error: "Webhook failed",
      }),
      {
        status: 500,
      }
    );
  }
}