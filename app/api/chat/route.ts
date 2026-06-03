import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const response = await client.responses.create({
  model: "gpt-5-nano",
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

    return Response.json({
      reply: response.output_text,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}