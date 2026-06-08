export const runtime = "nodejs";

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const PLAN_LIMITS = {
  free: {
    messages: 30,
    uploads: 2,
  },

  go: {
    messages: 300,
    uploads: 10,
  },

  pro: {
    messages: 1000,
    uploads: 30,
  },

  builder: {
    messages: Infinity,
    uploads: Infinity,
  },
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const messages = JSON.parse(
      formData.get("messages") as string
    );

    const model =
      (formData.get("model") as string) ||
      "gpt-5-nano";

    const userId =
  (formData.get("userId") as string) || "";

if (!userId) {
  return Response.json(
    {
      error: "Please sign in to use RazorswitchGPT.",
    },
    {
      status: 401,
    }
  );
}

let finalModel = "gpt-5-nano";

    const files = formData
      .getAll("files")
      .filter(
        (item): item is File =>
          item instanceof File
      );

    const legacyFile = formData.get(
      "file"
    ) as File | null;

    const uploadedFiles = legacyFile
      ? [...files, legacyFile]
      : files;

    const inputMessages: any[] = [
      {
        role: "system",
        content:
          "You are a helpful AI assistant. Format all code using markdown code blocks.",
      },
    ];

    if (uploadedFiles.length > 0) {
      inputMessages.push({
        role: "system",
        content:
          "Uploaded files:\n" +
          uploadedFiles
            .map(
              (file) =>
                `- ${file.name} (${file.type || "unknown"})`
            )
            .join("\n"),
      });
    }

    for (const file of uploadedFiles) {
      if (file.type.startsWith("image/")) {
        const bytes =
          await file.arrayBuffer();

        const imageBase64 =
          Buffer.from(bytes).toString(
            "base64"
          );

        inputMessages.push({
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Analyze the uploaded image file ${file.name}.`,
            },
            {
              type: "input_image",
              image_url: `data:${file.type};base64,${imageBase64}`,
            },
          ],
        });

        continue;
      }

      if (file.type.startsWith("video/")) {
        inputMessages.push({
          role: "system",
          content: `Uploaded video file "${file.name}" (${file.type}). The assistant cannot inspect video frames directly.`,
        });

        continue;
      }

      if (
        file.type.startsWith("text/") ||
        file.type.includes("json") ||
        file.type.includes("csv")
      ) {
        const fileText =
          await file.text();

        if (fileText.trim()) {
          inputMessages.push({
            role: "system",
            content: `Uploaded file "${file.name}" contents:\n\n${fileText}`,
          });

          continue;
        }
      }

      inputMessages.push({
        role: "system",
        content: `Uploaded file "${file.name}" of type ${file.type}.`,
      });
    }

    inputMessages.push(
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }))
    );

    if (userId) {
      const { data: subscription } =
        await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle();

      const plan =
  subscription?.plan?.toLowerCase() ||
  "free";

      const today = new Date()
        .toISOString()
        .split("T")[0];

      const { data: usages } =
        await supabase
          .from("usage_stats")
          .select("*")
          .eq("user_id", userId)
          .eq("usage_date", today);

      const usage = usages?.[0];

      const messagesToday =
        usage?.messages_today ?? 0;

      const limit =
  PLAN_LIMITS[
    (plan in PLAN_LIMITS
      ? plan
      : "free") as keyof typeof PLAN_LIMITS
  ].messages;
  console.log("PLAN:", plan);
console.log("LIMIT:", limit);

      console.log(
        "MESSAGES TODAY:",
        messagesToday
      );

      if (
        messagesToday >= limit &&
        userId !==
          "98b6aee2-8af8-4d5b-9d7e-cc8774edc3ca"
      ) {
        return Response.json(
          {
            error: `Daily limit reached (${limit} messages).`,
          },
          {
            status: 403,
          }
        );
      }

      if (usage) {
        await supabase
          .from("usage_stats")
          .update({
            messages_today:
              messagesToday + 1,
          })
          .eq("id", usage.id);
      } else {
        await supabase
          .from("usage_stats")
          .insert({
            user_id: userId,
            messages_today: 1,
            uploads_today: 0,
            usage_date: today,
          });
      }
    }

    const stream =
      await client.responses.create({
        model: finalModel,
        stream: true,
        input: inputMessages,
      });

    const encoder =
      new TextEncoder();

    const readable =
      new ReadableStream({
        async start(controller) {
          for await (const event of stream) {
            if (
              event.type ===
              "response.output_text.delta"
            ) {
              controller.enqueue(
                encoder.encode(
                  event.delta
                )
              );
            }
          }

          controller.close();
        },
      });

    return new Response(readable, {
      headers: {
        "Content-Type":
          "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          "Something went wrong",
      },
      {
        status: 500,
      }
    );
  }
}