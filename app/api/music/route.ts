import { supabaseAdmin } from "@/lib/supabase-admin";

const PLAN_LIMITS = {
  free: { music: 0 },
  go: { music: 5 },
  pro: { music: 20 },
  builder: { music: Infinity },
};

export async function POST(req: Request) {
  try {
    const { prompt, userId } = await req.json();

    if (!userId) {
  return Response.json(
    {
      error:
        "Please sign in to generate music.",
    },
    {
      status: 401,
    }
  );
}

    const today = new Date()
      .toISOString()
      .split("T")[0];

    const { data: usage } = await supabaseAdmin
      .from("usage_stats")
      .select("*")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    const { data: subscription } =
      await supabaseAdmin
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

    const plan = (
      subscription?.plan?.toLowerCase() ||
      "free"
    ) as keyof typeof PLAN_LIMITS;

    const limit =
      PLAN_LIMITS[plan].music;

    if (
      limit !== Infinity &&
      (usage?.music_today ?? 0) >= limit
    ) {
      return Response.json(
        {
          error:
            "Daily music limit reached",
        },
        {
          status: 403,
        }
      );
    }
const enhancedPrompt = `
Create a professional full-length song.

Genre:
${prompt}

Requirements:
- Commercial quality production
- Strong intro
- Verse and chorus structure
- Emotional progression
- Rich instrumentation
- High quality mixing and mastering
- Natural sounding vocals
- Modern radio-ready sound
- Full song composition
- Memorable melody
- Dynamic arrangement
`;
    const response = await fetch(
      "https://api.elevenlabs.io/v1/music",
      {
        method: "POST",
        headers: {
          "xi-api-key":
            process.env
              .ELEVENLABS_API_KEY!,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
  prompt: enhancedPrompt,
  music_length_ms: 180000,
  model_id: "music_v1",
  force_instrumental: false,
}),
      }
    );

   if (!response.ok) {
  const errorText = await response.text();

  console.log(
    "ELEVEN RESPONSE:",
    response.status
  );

  console.log(errorText);

  throw new Error(errorText);
}

    const audioBuffer =
      await response.arrayBuffer();

    await supabaseAdmin
      .from("usage_stats")
      .upsert({
        user_id: userId,
        usage_date: today,
        messages_today:
          usage?.messages_today ?? 0,
        uploads_today:
          usage?.uploads_today ?? 0,
        images_today:
          usage?.images_today ?? 0,
        music_today:
          (usage?.music_today ?? 0) +
          1,
      });

    return new Response(
      audioBuffer,
      {
        headers: {
          "Content-Type":
            "audio/mpeg",
        },
      }
    );
  } catch (error: any) {
    console.error(
      "MUSIC ERROR:",
      error
    );

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