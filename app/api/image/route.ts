import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase-admin";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PLAN_LIMITS = {
  free: { images: 0 },
  go: { images: 10 },
  pro: { images: 30 },
  builder: { images: Infinity },
};

export async function POST(req: Request) {
  try {
    const { prompt, userId } = await req.json();

    if (!userId) {
      return Response.json(
        { error: "Missing user ID" },
        { status: 401 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: usage } = await supabaseAdmin
      .from("usage_stats")
      .select("*")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    const plan =
      (subscription?.plan?.toLowerCase() || "free") as keyof typeof PLAN_LIMITS;

    const imageLimit = PLAN_LIMITS[plan].images;

    if (
      imageLimit !== Infinity &&
      (usage?.images_today ?? 0) >= imageLimit
    ) {
      return Response.json(
        {
          error: "Daily image limit reached",
        },
        {
          status: 403,
        }
      );
    }

    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    });

    await supabaseAdmin.from("usage_stats").upsert({
      user_id: userId,
      usage_date: today,
      messages_today: usage?.messages_today ?? 0,
      uploads_today: usage?.uploads_today ?? 0,
      images_today: (usage?.images_today ?? 0) + 1,
    });

    return Response.json({
      image: result.data?.[0]?.b64_json,
    });
  } catch (error: any) {
    console.error("IMAGE ERROR:", error);

    return Response.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}