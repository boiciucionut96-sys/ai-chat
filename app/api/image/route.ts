import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
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