
export const runtime = "nodejs";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";
import { pathToFileURL } from "url";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

const messages = JSON.parse(
  formData.get("messages") as string
);

const model = formData.get("model") as string;
const userId = formData.get("userId") as string;

let finalModel = "gpt-5-nano";

if (userId) {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const isPro = !!subscription;

  if (isPro) {
    finalModel = model || "gpt-5";
  }
}

const files = formData.getAll("files").filter(
  (item): item is File => item instanceof File
);
const legacyFile = formData.get("file") as File | null;
const uploadedFiles = legacyFile ? [...files, legacyFile] : files;

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
            `- ${file.name} (${file.type || "unknown type"})`
        )
        .join("\n"),
  });
}

for (const file of uploadedFiles) {
  if (file.type.startsWith("image/")) {
    const bytes = await file.arrayBuffer();
    const imageBase64 = Buffer.from(bytes).toString("base64");

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

  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const require = createRequire(import.meta.url);
    const workerPath = require.resolve(
      "pdfjs-dist/legacy/build/pdf.worker.mjs"
    );
    const workerUrl = pathToFileURL(workerPath).href;

    // @ts-ignore: importing a runtime-only CJS entrypoint from pdf-parse
    
    const PDFParse = pdfParseModule.PDFParse;
    PDFParse.setWorker(workerUrl);

    const bytes = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: bytes });
    const pdfTextResult: any = await parser.getText();
    const extractedText = ((pdfTextResult?.text ?? pdfTextResult) as string)
      .trim();
    const info = await parser.getInfo();
    const pageCount = info.total ?? info.pages ?? "?";
    const truncatedText =
      extractedText.length > 20000
        ? `${extractedText.slice(0, 20000)}\n\n[truncated]`
        : extractedText;

    if (truncatedText) {
      inputMessages.push({
        role: "system",
        content: `Uploaded PDF \"${file.name}\" (${pageCount} pages). Extracted text below:\n\n${truncatedText}`,
      });
      continue;
    }

    inputMessages.push({
      role: "system",
      content: `Uploaded PDF \"${file.name}\" (${pageCount} pages) but no extractable text was found.`,
    });
    continue;
  }

  if (file.type.startsWith("video/")) {
    inputMessages.push({
      role: "system",
      content: `Uploaded video file \"${file.name}\" (${file.type}, ${Math.round(
        file.size / 1024
      )} KB). The assistant cannot inspect raw video frames directly, so please answer using the file name and any additional description.`,
    });
    inputMessages.push({
      role: "user",
      content: `Please consider the uploaded video file ${file.name} when answering.`,
    });
    continue;
  }

  if (
    file.type.startsWith("text/") ||
    file.type.includes("json") ||
    file.type.includes("csv")
  ) {
    const fileText = await file.text();
    if (fileText.trim()) {
      inputMessages.push({
        role: "system",
        content: `Uploaded file \"${file.name}\" contents:\n\n${fileText}`,
      });
      continue;
    }
  }

  inputMessages.push({
    role: "system",
    content: `Uploaded file \"${file.name}\" of type ${file.type || "unknown type"}.`,
  });
}

inputMessages.push(
  ...messages.map((msg: any) => ({
    role: msg.role,
    content: msg.content,
  }))
);

const stream = await client.responses.create({
  model: finalModel,
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