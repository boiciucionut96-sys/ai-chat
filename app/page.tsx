"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
type Chat = {
  id: string;
  title: string;
  messages: Message[];
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState<Chat[]>([]); 
const [activeChatId, setActiveChatId] = useState("");
const currentChat =
  chats.find((chat) => chat.id === activeChatId) ||
  chats[0] ||
  {
    id: "",
    title: "",
    messages: [],
  };
  const [loading, setLoading] = useState(false);

  const chatContainerRef = useRef<HTMLElement | null>(null);
  // Load chats from localStorage
useEffect(() => {
  const savedChats = localStorage.getItem("chats");
  const savedActiveChat = localStorage.getItem("activeChatId");

  if (savedChats) {
    setChats(JSON.parse(savedChats));
  } else {
    const firstChat = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
    };

    setChats([firstChat]);
    setActiveChatId(firstChat.id);
  }

  if (savedActiveChat) {
    setActiveChatId(savedActiveChat);
  }
}, []);

// Save chats
useEffect(() => {
  if (chats.length > 0) {
    localStorage.setItem("chats", JSON.stringify(chats));
  }
}, [chats]);

// Save active chat
useEffect(() => {
  if (activeChatId) {
    localStorage.setItem("activeChatId", activeChatId);
  }
}, [activeChatId]);

  useEffect(() => {
  if (chats.length > 0 && !activeChatId) {
    setActiveChatId(chats[0].id);
  }
}, [chats, activeChatId]);

const deleteChat = (id: string) => {
  const remaining = chats.filter((chat) => chat.id !== id);

  if (remaining.length === 0) {
    const firstChat = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
    };

    setChats([firstChat]);
    setActiveChatId(firstChat.id);
    return;
  }

  setChats(remaining);

  if (activeChatId === id) {
    setActiveChatId(remaining[0].id);
  }
};

const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message;

    const updatedMessages: Message[] = [
  ...currentChat.messages,
      {
        role: "user",
        content: userMessage,
      },
    ];

    setChats((prev) =>
  prev.map((chat) =>
    chat.id === activeChatId
      ? { ...chat, messages: updatedMessages }
      : chat
  )
);
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

const reader = res.body?.getReader();

if (!reader) {
  throw new Error("No stream");
}

let assistantText = "";

const streamingMessages = [
  ...updatedMessages,
  {
    role: "assistant" as const,
    content: "",
  },
];

setChats((prev) =>
  prev.map((chat) =>
    chat.id === activeChatId
      ? {
          ...chat,
          title:
  chat.messages.length <= 1
    ? (
        userMessage
          .replace(/\n/g, " ")
          .trim()
          .slice(0, 40) +
        (userMessage.length > 40 ? "..." : "")
      )
    : chat.title,
          messages: streamingMessages,
        }
      : chat
  )
);

let chunkCount = 0;
while (true) {
  const { done, value } = await reader.read();

  if (done) break;

  console.log("received chunk");

  
  assistantText += new TextDecoder().decode(value);
chunkCount++;

if (chunkCount % 10 !== 0) continue;

  setChats((prev) =>
  prev.map((chat) => {
    if (chat.id !== activeChatId) return chat;

    const msgs = [...chat.messages];

    msgs[msgs.length - 1] = {
      role: "assistant",
      content: assistantText,
    };

    return {
      ...chat,
      messages: msgs,
    };
  })
);
}
    } catch {
      const errorMessages = [
  ...updatedMessages,
  {
    role: "assistant" as const,
    content: "Error contacting server.",
  },
];

setChats((prev) =>
  prev.map((chat) =>
    chat.id === activeChatId
      ? { ...chat, messages: errorMessages }
      : chat
  )
);
    }

    setLoading(false);
  };

  const newChat = () => {
  const chat = {
    id: crypto.randomUUID(),
    title: `Chat ${chats.length + 1}`,
    messages: [],
  };

  setChats((prev) => [...prev, chat]);
  setActiveChatId(chat.id);
  setMessage("");
};

  return (
    <div className="flex h-screen bg-[#202123] text-white">
      {/* Sidebar */}
<aside className="w-64 bg-[#171717] border-r border-zinc-800 p-3">
  <button
    onClick={newChat}
    className="w-full rounded-lg border border-zinc-700 p-3 text-left hover:bg-zinc-800"
  >
    + New Chat
  </button>

  <div className="mt-4 space-y-2">
    {chats.map((chat) => (
  <div key={chat.id} className="flex gap-2">
    <button
      title={chat.title}
      onClick={() => setActiveChatId(chat.id)}
      className={`flex-1 rounded-lg p-2 text-left ${
        activeChatId === chat.id
          ? "bg-zinc-700"
          : "bg-zinc-800"
      }`}
    >
      {chat.title}
    </button>

    <button
      onClick={() => deleteChat(chat.id)}
      className="rounded-lg bg-red-600 px-2 hover:bg-red-700"
    >
      ×
    </button>
  </div>
))}
  </div>
</aside>

      {/* Main Area */}
      <div className="flex flex-1 flex-col">
        <header className="border-b border-zinc-800 p-4 font-semibold">
          AI Chat
        </header>

        <main
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-6"
        >
          <div className="max-w-4xl mx-auto">
            {currentChat.messages.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-center mt-40">
                  <h1 className="text-5xl font-bold mb-3">
                    AI Chat
                  </h1>
                  <p className="text-zinc-400">
                    Ask me anything.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {currentChat.messages.map((msg, index) => (
  <div
    key={index}
    className={`mb-4 p-4 rounded-2xl max-w-3xl break-words ${
      msg.role === "user"
        ? "bg-[#2f67f6] ml-auto"
        : "bg-[#303030]"
    }`}
  >
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");

      return match ? (
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  }}
>
  {msg.content}
</ReactMarkdown>
    </div>
  </div>
))}

                {loading && (
                  <div className="bg-[#303030] p-4 rounded-2xl max-w-3xl">
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
              className="rounded-xl bg-[#2f67f6] px-6 hover:opacity-90 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}