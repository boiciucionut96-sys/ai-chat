"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const updatedMessages: Message[] = [
      ...messages,
      {
        role: "user",
        content: message,
      },
    ];

    setMessages(updatedMessages);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      const data = await res.json();

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Sorry, something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const newChat = () => {
    setMessages([]);
    setMessage("");
  };

  return (
    <div className="h-screen bg-[#212121] text-white flex">
      <aside className="w-64 bg-[#171717] border-r border-zinc-800 p-3">
        <button
          onClick={newChat}
          className="w-full rounded-lg bg-zinc-800 p-3 text-left hover:bg-zinc-700 transition"
        >
          + New Chat
        </button>
      </aside>

      <div className="flex flex-col flex-1">
        <header className="p-4 border-b border-zinc-800 font-semibold">
          AI Chat
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[70vh] text-center">
                <h1 className="text-5xl font-bold mb-4">
                  AI Chat
                </h1>

                <p className="text-zinc-400 text-lg">
                  Ask me anything.
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`mb-4 p-4 rounded-2xl max-w-[80%] break-words ${
                      msg.role === "user"
                        ? "bg-[#2f67f6] ml-auto"
                        : "bg-[#303030]"
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}

                {loading && (
                  <div className="bg-[#303030] p-4 rounded-2xl max-w-[80%]">
                    AI is thinking...
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <div className="border-t border-zinc-800 p-4">
          <div className="max-w-4xl mx-auto flex gap-2">
            <input
              className="flex-1 rounded-xl bg-[#303030] p-4 outline-none"
              placeholder="Message AI Chat..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
            />

            <button
              onClick={sendMessage}
              disabled={loading}
              className="rounded-xl bg-[#2f67f6] px-6 hover:opacity-90 transition disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}