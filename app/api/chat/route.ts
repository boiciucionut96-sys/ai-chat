export const runtime = "nodejs";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();

    const stream = await client.responses.create({
      model: model || "gpt-5-nano",
      stream: true,
      input: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant. Format all code using markdown code blocks.",
        },
        ...messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
      ],
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
  if (event.type === "response.output_text.delta") {
    console.log("chunk:", event.delta);

    controller.enqueue(
      encoder.encode(event.delta)
    );
  }
}

        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}