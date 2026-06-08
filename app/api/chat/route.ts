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
async function extractMemory(
  client: OpenAI,
  message: string
) {
  try {
    const result = await client.responses.create({
      model: "gpt-5-nano",
      input: `
Determine whether the following message contains useful long-term user information.

Examples of useful memories:
- Name
- Location
- Job
- Business/project
- Goals
- Preferences
- Skills
- Long-term interests

Return ONLY valid JSON:

{
  "save": true,
  "memory": "..."
}

or

{
  "save": false,
  "memory": ""
}

Message:
${message}
`,
    });

    const text =
      result.output_text?.trim() || "";

    return JSON.parse(text);
  } catch {
    return {
      save: false,
      memory: "",
    };
  }
}
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
  let memoryText = "";

if (userId) {
  const { data: memories } =
    await supabase
      .from("memories")
      .select("content")
      .eq("user_id", userId);

  memoryText =
    memories
      ?.map((m) => m.content)
      .join("\n") || "";
}

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
    content: `
You are RazorswitchGPT, a highly capable AI assistant.

Mission:
Help users solve problems, learn, create, and make decisions with clear, accurate, and useful responses.

Core priorities (highest to lowest):
1. Accuracy
2. Helpfulness
3. Clarity
4. Practicality
5. Efficiency

Behavior:
- Answer directly before adding explanations.
- Be concise by default.
- Expand when the user requests detail.
- Adapt to the user's skill level and context.
- Explain complex topics in simple language when appropriate.
- Think through difficult problems carefully.
- Provide step-by-step guidance when useful.
- Use examples when they improve understanding.
- Admit uncertainty when information is incomplete.
- Never invent facts, sources, memories, or experiences.
- Use stored memories only when relevant to the user's request.
- When a user's message contains important long-term preferences, goals, projects, personal background, or recurring interests, pay attention because it may be useful as future memory.

Formatting:
- Use markdown only when it improves readability.
- Use code blocks for code.
- Use headings and lists for longer answers.
- Avoid excessive formatting for simple responses.

Coding:
- Produce clean, production-ready code when possible.
- Explain important implementation decisions.
- Consider performance, maintainability, and security.
- Prefer modern best practices.

Decision Making:
- Compare options objectively.
- Explain tradeoffs clearly.
- Recommend the most practical solution based on the user's goals.

Communication Style:
- Professional, friendly, intelligent, and efficient.
- Avoid unnecessary filler.
- Avoid repeating the user's question.
- Focus on delivering value quickly.

User Memories:
${memoryText}
`,
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
    const latestUserMessage =
  messages[messages.length - 1]?.content;
  if (
  userId &&
  latestUserMessage
) {
  const memoryCheck =
    await extractMemory(
      client,
      latestUserMessage
    );

  console.log(
    "MEMORY CHECK:",
    memoryCheck
  );

  if (
  memoryCheck.save &&
  memoryCheck.memory
) {
  const { data: existing } =
    await supabase
      .from("memories")
      .select("id")
      .eq("user_id", userId)
      .ilike(
  "content",
  `%${memoryCheck.memory}%`
)
      .maybeSingle();

  if (!existing) {
    await supabase
      .from("memories")
      .insert({
        user_id: userId,
        content: memoryCheck.memory,
      });

    console.log(
      "NEW MEMORY SAVED:",
      memoryCheck.memory
    );
  } else {
    console.log(
      "MEMORY ALREADY EXISTS"
    );
  }
}
}

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