
export const runtime = "nodejs";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

const messages = JSON.parse(
  formData.get("messages") as string
);

const model = formData.get("model") as string;

const file = formData.get("file") as File | null;

let fileContent = "";

if (file && file.type === "text/plain") {
  fileContent = await file.text();
}

const isImage =
  file && file.type.startsWith("image/");

let imageBase64 = "";

if (isImage && file) {
  const bytes = await file.arrayBuffer();

  imageBase64 = Buffer.from(bytes).toString("base64");
}

const inputMessages: any[] = [
  {
    role: "system",
    content:
      "You are a helpful AI assistant. Format all code using markdown code blocks.",
  },
];

if (fileContent) {
  inputMessages.push({
    role: "system",
    content: `Uploaded file contents:\n\n${fileContent}`,
  });
}
if (imageBase64 && file) {
  inputMessages.push({
    role: "user",
    content: [
      {
        type: "input_text",
        text: "Analyze this image.",
      },
      {
        type: "input_image",
        image_url: `data:${file.type};base64,${imageBase64}`,
      },
    ],
  });
}

inputMessages.push(
  ...messages.map((msg: any) => ({
    role: msg.role,
    content: msg.content,
  }))
);

const stream = await client.responses.create({
  model: model || "gpt-5-nano",
  stream: true,
  input: inputMessages,
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