"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState, useEffect, useRef } from "react";
import { supabase, signInWithGoogle } from "@/lib/supabase";
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
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedChats = localStorage.getItem("chats");
    // your existing localStorage code...
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error || !data.user) {
        // Clear invalid session to start fresh
        await supabase.auth.signOut();
        setUser(null);
        return;
      }

      setUser(data.user);

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", data.user.id)
        .eq("status", "active")
        .maybeSingle();

      if (data.user.email === "boiciucionut96@gmail.com") {
  setIsPro(true);
} else {
  setIsPro(!!subscription);
}
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
  setIsPro(false);
} else if (
  session.user.email === "boiciucionut96@gmail.com"
) {
  setIsPro(true);
}
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // rest of Home component...

    const stopGeneration = () => {
  abortController?.abort();
  setLoading(false);
  setAbortController(null);
};
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState<Chat[]>([]); 
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
const [editingText, setEditingText] = useState("");
const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
const [renameValue, setRenameValue] = useState("");
const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
const fileInputRef = useRef<HTMLInputElement | null>(null);
const [isPro, setIsPro] = useState(false);

const clearSelectedFiles = () => {
  setSelectedFiles([]);
  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
};

const handleLogout = async () => {
  await supabase.auth.signOut();

  setUser(null);

  window.location.reload();
};

const handleUpgrade = async () => {
  const res = await fetch(
    "/api/create-checkout-session",
    {
      method: "POST",
    }
  );

  const data = await res.json();

  window.location.href = data.url;
};
  

const regenerateResponse = async () => {
  if (!currentChat) return;

  const messagesWithoutLastAssistant =
    currentChat.messages[currentChat.messages.length - 1]?.role === "assistant"
      ? currentChat.messages.slice(0, -1)
      : currentChat.messages;

  setChats((prev) =>
    prev.map((chat) =>
      chat.id === activeChatId
        ? {
            ...chat,
            messages: messagesWithoutLastAssistant,
          }
        : chat
    )
  );

  const lastUserMessage = [...messagesWithoutLastAssistant]
    .reverse()
    .find((m) => m.role === "user");

  if (!lastUserMessage) return;

  setMessage(lastUserMessage.content);

setTimeout(() => {
  const sendBtn = document.querySelector(
    'button[class*="bg-blue"]'
  ) as HTMLButtonElement | null;

  sendBtn?.click();
}, 100);
};      const [activeChatId, setActiveChatId] = useState("");
const [model, setModel] = useState("gpt-5-nano");
const currentChat =
  chats.find((chat) => chat.id === activeChatId) ||
  chats[0] ||
  {
    id: "",
    title: "",
    messages: [],
  };
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] =
  useState<AbortController | null>(null);

  const chatContainerRef = useRef<HTMLElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const renameChat = (id: string) => {
  const newTitle = window.prompt("New chat title:");

  if (newTitle === null || newTitle.trim() === "") {
    return;
  }

  setChats((prev) =>
    prev.map((chat) =>
      chat.id === id
        ? { ...chat, title: newTitle.trim() }
        : chat
    )
  );
};

  // Load chats from localStorage
useEffect(() => {
  const savedChats = localStorage.getItem("chats");
  const savedActiveChat = localStorage.getItem("activeChatId");

   if (chatContainerRef.current) {
    chatContainerRef.current.scrollTop =
      chatContainerRef.current.scrollHeight;
  }
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

useEffect(() => {
  bottomRef.current?.scrollIntoView({
    behavior: "smooth",
  });
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
    clearSelectedFiles();
    return;
  }

  setChats(remaining);

  if (activeChatId === id) {
    setActiveChatId(remaining[0].id);
    clearSelectedFiles();
  }
};

const sendMessage = async () => {
  if ((!message.trim() && selectedFiles.length === 0) || loading) return;

  let userMessage = message;

  if (!userMessage.trim() && selectedFiles.length > 0) {
    userMessage = `Uploaded files: ${selectedFiles
      .map((file) => file.name)
      .join(", ")}`;
  }

  if (
    currentChat.title === "New Chat" &&
    userMessage.trim()
  ) {
    const title =
      userMessage.length > 30
        ? userMessage.slice(0, 30) + "..."
        : userMessage;

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, title }
          : chat
      )
    );
  }

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

  const controller = new AbortController();
  const formData = new FormData();

  formData.append(
    "messages",
    JSON.stringify(updatedMessages)
  );

  formData.append("model", model);
  if (user) {
    formData.append("userId", user.id);
  }

  selectedFiles.forEach((file) => {
    formData.append("files", file);
  });

  setAbortController(controller);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      signal: controller.signal,
      body: formData,
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

      assistantText += new TextDecoder().decode(value);
      chunkCount++;

      if (chunkCount % 5 !== 0) continue;

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
  } catch (error: any) {
    if (error.name === "AbortError") {
      setLoading(false);
      setAbortController(null);
      clearSelectedFiles();
      return;
    }

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
  } finally {
    setLoading(false);
    setAbortController(null);
    clearSelectedFiles();
  }
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
  clearSelectedFiles();
};

  return (
    <div className="relative flex h-screen flex-col bg-[#202123] text-white md:flex-row">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-40 w-80 max-w-full overflow-hidden bg-[#171717] border-r border-zinc-800 shadow-2xl transition-transform duration-300 md:relative md:translate-x-0 md:w-64`}
      >
        <div className="p-3">
          <button
            onClick={newChat}
            className="w-full rounded-lg border border-zinc-700 p-3 text-left hover:bg-zinc-800"
          >
            + New Chat
          </button>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="mt-2 w-full rounded-lg bg-zinc-800 p-2 text-sm"
          />

          <div className="mt-4 space-y-2">
            {chats
              .filter((chat) =>
                chat.title.toLowerCase().includes(search.toLowerCase())
              )
              .map((chat) => (
                <div key={chat.id} className="flex gap-2">
                  <button
                    title={chat.title}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      setSelectedFiles([]);
                    }}
                    className={`flex-1 rounded-lg p-2 text-left ${
                      activeChatId === chat.id
                        ? "bg-zinc-700"
                        : "bg-zinc-800"
                    }`}
                  >
                    {renamingChatId === chat.id ? (
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="w-full bg-zinc-700 rounded p-1 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setChats((prev) =>
                              prev.map((c) =>
                                c.id === chat.id
                                  ? { ...c, title: renameValue }
                                  : c
                              )
                            );
                            setRenamingChatId(null);
                          }
                        }}
                      />
                    ) : (
                      chat.title
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setRenamingChatId(chat.id);
                      setRenameValue(chat.title);
                    }}
                    className="rounded-lg bg-zinc-700 px-2 hover:bg-zinc-600"
                  >
                    ✏️
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
        </div>
      </aside>

      <div
        className={`${sidebarOpen ? "fixed inset-0 z-30 bg-black/40 md:hidden" : "hidden"}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col md:ml-0">
        <header className="flex flex-col gap-4 border-b border-zinc-800 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-3 md:justify-start">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded p-2 hover:bg-zinc-800 md:hidden"
            >
              ☰
            </button>
            <div className="flex items-center gap-3">
              <div className="text-xl">⚡</div>
              <h1 className="font-semibold">RazorswitchGPT</h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded bg-zinc-800 px-3 py-1 text-sm"
            >
              {isPro && (
                <>
                  <option value="gpt-5">GPT-5</option>
                  <option value="gpt-5-mini">GPT-5 Mini</option>
                </>
              )}
              <option value="gpt-5-nano">GPT-5 Nano</option>
            </select>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <span>{user.email}</span>
                  {isPro ? (
                    <span className="rounded bg-yellow-600 px-2 py-1 text-xs font-bold">
                      PRO
                    </span>
                  ) : (
                    <span className="rounded bg-zinc-700 px-2 py-1 text-xs">
                      FREE
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="rounded bg-zinc-800 px-3 py-1 text-sm"
              >
                Sign In
              </button>
            )}

            {!isPro && (
              <button
                onClick={handleUpgrade}
                className="bg-blue-600 px-3 py-1 rounded"
              >
                Upgrade
              </button>
            )}
          </div>
        </header>

        <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {currentChat.messages.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-center mt-40">
                  <h1 className="text-5xl font-bold mb-3">RazorswitchGPT</h1>
                  <p className="text-zinc-400">Your personal AI assistant.</p>
                </div>
              </div>
            ) : (
              <>
                {currentChat.messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`mb-4 p-4 rounded-2xl max-w-3xl break-words ${
                      msg.role === "user" ? "bg-[#2f67f6] ml-auto" : "bg-[#303030]"
                    }`}
                  >
                    {editingIndex === index ? (
                      <div>
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full rounded bg-zinc-800 p-2 text-white"
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => {
                              setChats((prev) =>
                                prev.map((chat) => {
                                  if (chat.id !== activeChatId) return chat;
                                  const updated = [...chat.messages];
                                  updated[index] = {
                                    ...updated[index],
                                    content: editingText,
                                  };
                                  return {
                                    ...chat,
                                    messages: updated.slice(0, index + 1),
                                  };
                                })
                              );
                              setEditingIndex(null);
                              setTimeout(() => {
                                sendMessage();
                              }, 100);
                            }}
                            className="rounded bg-green-600 px-2 py-1"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="rounded bg-zinc-600 px-2 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
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
                    )}

                    {msg.role === "user" && editingIndex !== index && (
                      <button
                        onClick={() => {
                          setEditingIndex(index);
                          setEditingText(msg.content);
                        }}
                        className="mt-2 mr-3 text-xs text-zinc-400 hover:text-white"
                      >
                        ✏️ Edit
                      </button>
                    )}

                    {msg.role === "assistant" && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          setCopiedIndex(index);
                          setTimeout(() => setCopiedIndex(null), 2000);
                        }}
                        className="mt-2 mr-3 text-xs text-zinc-400 hover:text-white"
                      >
                        {copiedIndex === index ? "✓ Copied" : "📋 Copy"}
                      </button>
                    )}

                    {!loading && (
                      <button
                        onClick={regenerateResponse}
                        className="mt-3 text-xs text-zinc-400 hover:text-white"
                      >
                        🔄 Regenerate
                      </button>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="bg-[#303030] p-4 rounded-2xl max-w-3xl">
                    AI is thinking...
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>
        </main>

        <div className="border-t border-zinc-800 p-4">
          <div className="max-w-4xl mx-auto flex flex-col gap-3 px-2">
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded bg-zinc-800 p-2"
                  >
                    {file.type.startsWith("image/") ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt="preview"
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="text-xs text-zinc-400">📄</div>
                    )}
                    <span className="text-xs text-zinc-300 max-w-[150px] truncate">
                      {file.name}
                    </span>
                    <button
                      onClick={() =>
                        setSelectedFiles((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="rounded bg-red-600 px-1 py-0.5 text-xs hover:bg-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setSelectedFiles((prev) => [...prev, ...files]);
                }}
                className="flex-1"
              />

              <textarea
                className="w-full min-h-[88px] rounded-xl bg-[#303030] p-4 outline-none resize-none sm:flex-1"
                placeholder="Message AI Chat..."
                value={message}
                rows={2}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />

              {loading ? (
                <button
                  onClick={stopGeneration}
                  className="rounded-lg bg-red-600 px-4 hover:bg-red-700"
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  className="rounded-lg bg-blue-600 px-4 hover:bg-blue-700"
                >
                  Send
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
