import React, { useState, useEffect, useCallback } from "react";
import { FaFilePdf, FaFileImage, FaFileAlt, FaTimes } from "react-icons/fa";
import { FaBars } from "react-icons/fa";
import ChatList from "../Components/ChatList";
import ChatBox from "../Components/ChatBox";
import ChatInput from "../Components/Chatinput";
import {
  getGeminiResponse,
  saveMessage,
  createChat,
  updateChat,
  getMessages,
  deleteChat as apiDeleteChat,
  askWithFiles,
  getChats,
  checkAuthStatus,
} from "../Services/Api";
import { showToast } from "../Services/Toast";

export default function ChatPage() {
  // All state hooks at the top to avoid 'not defined' errors
  const [user, setUser] = useState(() => {
    const name = localStorage.getItem("userName");
    const email = localStorage.getItem("userEmail");
    return name ? { name, email } : null;
  });
  const [chats, setChats] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]); // {id,file,name,sizeLabel,url,progress,status,type}
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [temporaryNoSave, setTemporaryNoSave] = useState(() => {
    try {
      return localStorage.getItem("noSave") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onStorage = (e) => {
      if (
        e.key === "userName" ||
        e.key === "userEmail" ||
        e.key === "isAuthenticated"
      ) {
        const name = localStorage.getItem("userName");
        const email = localStorage.getItem("userEmail");
        setUser(name ? { name, email } : null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Load chats and verify authentication on component mount
  useEffect(() => {
    const loadChatsFromServer = async () => {
      try {
        // First check if we're actually authenticated with the server
        const authStatus = await checkAuthStatus();
        if (!authStatus.authenticated) {
          // Clear local storage and redirect to login
          localStorage.removeItem("isAuthenticated");
          localStorage.removeItem("userName");
          localStorage.removeItem("userEmail");
          showToast({
            message: "Session expired. Please login again.",
            type: "error",
          });
          window.location.href = "/login";
          return;
        }

        // Load chats from server
        const serverChats = await getChats();
        if (Array.isArray(serverChats) && serverChats.length > 0) {
          // Transform server chats to match the expected format
          const formattedChats = serverChats.map((chat) => ({
            id: String(chat._id),
            title: chat.title || "Untitled Chat",
            messages: [], // Messages will be loaded on demand when chat is selected
            saved: true,
          }));

          setChats(formattedChats);
          // Set current to 0 to select the most recent chat (first in the sorted list)
          setCurrent(0);

          // Load messages for the first (most recent) chat
          if (formattedChats.length > 0) {
            const firstChatId = formattedChats[0].id;
            try {
              const msgs = await getMessages({ chatId: firstChatId });
              if (Array.isArray(msgs)) {
                setChats((prev) =>
                  prev.map((c, i) => (i === 0 ? { ...c, messages: msgs } : c))
                );
              }
            } catch (err) {
              console.warn("Failed to load messages for latest chat:", err);
            }
          }
        } else {
          // No chats exist, show welcome chat
          const welcomeChat = {
            id: String(Date.now()),
            title: "Welcome",
            messages: [
              { role: "bot", text: "Hi! I'm Gemini — how can I help today?" },
            ],
            saved: false,
          };
          setChats([welcomeChat]);
          setCurrent(0);
        }
      } catch (err) {
        console.error("Failed to load chats:", err);
        showToast({
          message: "Failed to load chats. Please try refreshing.",
          type: "error",
        });
      }
    };

    // Only load chats if user appears to be authenticated
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "1";
    if (isAuthenticated) {
      loadChatsFromServer();
    } else {
      // User not authenticated, show welcome chat for guests
      const welcomeChat = {
        id: String(Date.now()),
        title: "Welcome",
        messages: [
          { role: "bot", text: "Hi! I'm Gemini — how can I help today?" },
        ],
        saved: false,
      };
      setChats([welcomeChat]);
      setCurrent(0);
    }
  }, []);

  // (removed duplicate useState declarations for chats and temporaryNoSave)

  const deriveTitleFromMessages = useCallback((messages = []) => {
    if (!messages || messages.length === 0) return null;
    const firstUser = messages.find((m) => m.role === "user") || messages[0];
    if (!firstUser || !firstUser.text) return null;
    const cleaned = firstUser.text.replace(/\s+/g, " ").trim();
    return cleaned.split(" ").slice(0, 4).join(" ");
  }, []);

  // Helper: decide whether a chat should be saved to the server.
  const shouldSave = (chat) => {
    // explicit per-chat "saved: false" prevents saving
    if (chat && chat.saved === false) return false;
    // global temporary mode for authenticated users prevents saving
    if (user && temporaryNoSave) return false;
    // otherwise, allow saving
    return true;
  };

  const selectChat = async (index) => {
    setCurrent(index);
    const chat = chats[index];
    if (!chat) return;
    if (chat.messages && chat.messages.length > 0) return;
    const chatId = String(chat.id || "");
    if (!chatId) return;
    try {
      const msgs = await getMessages({ chatId });
      if (Array.isArray(msgs)) {
        setChats((prev) =>
          prev.map((c, i) => (i === index ? { ...c, messages: msgs } : c))
        );
      }
    } catch (err) {
      console.warn("Failed to load messages for chat", err);
      setChats((prev) =>
        prev.map((c, i) =>
          i === index
            ? {
                ...c,
                messages: [
                  ...(c.messages || []),
                  {
                    role: "bot",
                    text: "Messages could not be loaded. Sign in to view saved messages or check the server.",
                  },
                ],
              }
            : c
        )
      );
    }
  };

  const createNewChat = async () => {
    const localId = String(Date.now());
    const fresh = {
      id: localId,
      title: null,
      messages: [
        { role: "bot", text: "Hi! I'm Gemini — how can I help today?" },
      ],
      saved: user && temporaryNoSave ? false : true,
    };
    // prepend the new chat so newest chats appear at the top (index 0)
    setChats((prev) => [fresh, ...prev]);
    setCurrent(0);

    // If in temporary mode for authenticated user, skip creating on server
    if (user && temporaryNoSave) {
      showToast({
        message: "Temporary chat created (not saved)",
        type: "info",
      });
      setSidebarOpen(false);
      return;
    }

    const res = await createChat({ title: "" }).catch(() => null);
    if (res && res._id) {
      setChats((prev) =>
        prev.map((c) =>
          c.id === localId ? { ...c, id: String(res._id), saved: true } : c
        )
      );
      showToast({ message: "Chat created", type: "success" });
    }
    setSidebarOpen(false);
  };

  // Handle files selected from the ChatInput upload button.
  const handleFilesSelected = (files) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    for (const f of arr) {
      const id =
        Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const url = URL.createObjectURL(f);
      const entry = {
        id,
        file: f,
        name: f.name,
        size: f.size,
        sizeLabel: `${(f.size / (1024 * 1024)).toFixed(2)} MB`,
        url,
        progress: 0,
        status: "uploading",
        type: (f.name || "").split(".").pop().toLowerCase(),
      };
      // prepend so newest on left like screenshot
      setAttachments((prev) => [entry, ...prev]);
      // start simulated upload
      simulateUpload(entry.id);
    }
  };

  // Simulate upload progress for an attachment id
  const simulateUpload = (id) => {
    let prog = 0;
    const step = () => {
      prog += Math.random() * 20 + 5; // random increment
      if (prog >= 100) prog = 100;
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, progress: Math.round(prog) } : a
        )
      );
      if (prog < 100) {
        setTimeout(step, 300 + Math.random() * 400);
      } else {
        // mark done
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, status: "done", progress: 100 } : a
          )
        );
      }
    };
    setTimeout(step, 200);
  };

  const editChatTitle = async (index, newTitle) => {
    const chat = chats[index];
    if (!chat) return;
    if (typeof newTitle !== "string") return;
    setChats((prev) =>
      prev.map((c, i) => (i === index ? { ...c, title: newTitle } : c))
    );
    showToast({ message: "Chat title updated", type: "success" });
    try {
      // don't update server if this chat is marked unsaved (temporary)
      if (String(chat.id || "") && chat.saved !== false) {
        await updateChat(String(chat.id), { title: newTitle }).catch(
          () => null
        );
      }
    } catch (err) {
      console.warn("updateChat failed", err);
      showToast({ message: "Failed to update title", type: "error" });
    }
    setSidebarOpen(false);
  };

  const deleteChat = async (index) => {
    const chat = chats[index];
    if (!chat) return;
    const ok = window.confirm(
      "Delete this chat? This action cannot be undone."
    );
    if (!ok) return;
    const chatId = String(chat.id || "");
    setChats((prev) => prev.filter((_, i) => i !== index));
    showToast({ message: "Chat deleted", type: "success" });
    setCurrent((prev) => {
      if (prev === index) return Math.max(0, prev - 1);
      if (prev > index) return prev - 1;
      return prev;
    });
    try {
      // only call server delete if this chat was saved on server
      if (chatId && chat.saved !== false)
        await apiDeleteChat(chatId).catch(() => null);
    } catch (err) {
      console.warn("deleteChat failed", err);
      showToast({ message: "Failed to delete chat on server", type: "error" });
    }
    setSidebarOpen(false);
  };

  const handleSend = async (text) => {
    if (!text || !text.trim()) return;
    const chat = chats[current];
    if (!chat) return;
    let userMessage = { role: "user", text };
    if (attachments && attachments.length > 0) {
      userMessage = {
        ...userMessage,
        files: attachments.map((a) => ({
          name: a.name,
          type: a.type,
          size: a.size,
          url: a.url || null,
        })),
      };
    }

    // Prepare conversation history for Gemini
    const conversation = (chat.messages || []).map((m) => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.text,
    }));
    // Add the new user message
    conversation.push({ role: "user", content: text });

    // System prompt to instruct Gemini to use context
    const systemPrompt =
      "You are a helpful AI assistant. Always consider the full conversation history when replying, not just the last message. Answer as helpfully as possible, using all previous context.";

    setChats((prev) =>
      prev.map((c, i) =>
        i === current ? { ...c, messages: [...c.messages, userMessage] } : c
      )
    );
    // Clear attachments immediately after sending
    setAttachments([]);

    try {
      // Ensure the chat exists on the server before saving messages.
      // If the user is authenticated and this chat was created locally (id is numeric timestamp)
      // and it's not explicitly marked as temporary, create the chat on the server.
      let chatId = String(chat.id || "");
      let allowSave = shouldSave(chat);
      if (user && allowSave && chatId && /^\d+$/.test(chatId)) {
        const res = await createChat({ title: chat.title || "" }).catch(
          () => null
        );
        if (res && res._id) {
          const serverId = String(res._id);
          setChats((prev) =>
            prev.map((c, i) =>
              i === current ? { ...c, id: serverId, saved: true } : c
            )
          );
          chatId = serverId;
          allowSave = true;
        }
      }

      // only save to server if allowed
      if (allowSave && chatId) {
        await saveMessage({
          ...userMessage,
          chatId,
          title: chat.title || null,
        }).catch(() => null);
      }
    } catch (err) {
      console.warn("save user message failed", err);
    }

    setLoading(true);
    try {
      let botReply;
      // If attachments exist, upload them with the question and ask the server to extract
      if (attachments && attachments.length > 0) {
        try {
          const files = attachments.map((a) => a.file);
          const resp = await askWithFiles({ question: text, files });
          botReply =
            resp.answer || resp.extracted || "(No extracted text available)";
        } catch (err) {
          console.error("askWithFiles error", err);
          botReply = "⚠️ Failed to process attachments.";
        }
      } else {
        // Send conversation history and system prompt to Gemini
        botReply = await getGeminiResponse({
          systemPrompt,
          conversation,
        });
      }

      const botMessage = { role: "bot", text: botReply };
      setChats((prev) =>
        prev.map((c, i) =>
          i === current ? { ...c, messages: [...c.messages, botMessage] } : c
        )
      );
      try {
        // reuse the same decision logic as earlier: determine the id & whether we should save
        const chatIdNow = String(
          (chats[current] && chats[current].id) || chat.id || ""
        );
        const allowSaveNow = shouldSave(chats[current] || chat);
        if (allowSaveNow && chatIdNow) {
          await saveMessage({
            ...botMessage,
            chatId: chatIdNow,
            title: chat.title || null,
          }).catch(() => null);
        }
      } catch (err) {
        console.warn("save bot message failed", err);
      }
      // clear attachments after sending
      try {
        attachments.forEach((a) => a.url && URL.revokeObjectURL(a.url));
      } catch {
        // ignore URL revoke errors
      }
      setAttachments([]);
      if (!chat.title) {
        const newTitle = deriveTitleFromMessages(
          (chat.messages || []).concat(userMessage)
        );
        if (newTitle) {
          setChats((prev) =>
            prev.map((c, i) => (i === current ? { ...c, title: newTitle } : c))
          );
          if (String(chat.id || "") && chat.saved !== false) {
            updateChat(String(chat.id), { title: newTitle }).catch(() => null);
          }
        }
      }
    } catch (err) {
      console.warn("getGeminiResponse failed", err);
      const failMsg = {
        role: "bot",
        text: "⚠️ Something went wrong contacting Gemini.",
      };
      setChats((prev) =>
        prev.map((c, i) =>
          i === current ? { ...c, messages: [...c.messages, failMsg] } : c
        )
      );
      showToast({
        message: "Failed to get response from Gemini",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // when toggling temporary mode off, flush any unsaved chats to the server
  const flushTemporaryChats = async () => {
    const unsaved = chats.filter((c) => c.saved === false);
    if (unsaved.length === 0) return;
    showToast({
      message: `Saving ${unsaved.length} temporary chat(s)...`,
      type: "info",
    });
    for (const c of unsaved) {
      try {
        const res = await createChat({ title: c.title || "" }).catch(
          () => null
        );
        if (res && res._id) {
          const serverId = String(res._id);
          for (const m of c.messages || []) {
            await saveMessage({
              role: m.role,
              text: m.text,
              chatId: serverId,
              title: c.title || null,
            }).catch(() => null);
          }
          setChats((prev) =>
            prev.map((x) =>
              x.id === c.id ? { ...x, id: serverId, saved: true } : x
            )
          );
        }
      } catch (err) {
        console.warn("flushing temporary chat failed", err);
        showToast({ message: "Failed to save temporary chats", type: "error" });
      }
    }
    showToast({ message: "Temporary chats saved", type: "success" });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative">
      {/* Desktop sidebar: fill full height from the top so there is no gap above the sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-64 md:w-72 xl:w-80 hidden md:block">
        <ChatList
          chats={chats}
          current={current}
          onSelect={(i) => {
            selectChat(i);
            setSidebarOpen(false);
          }}
          onNew={() => {
            createNewChat();
            setSidebarOpen(false);
          }}
          onEditTitle={(i, title) => editChatTitle(i, title)}
          onDelete={(i) => {
            deleteChat(i);
            setSidebarOpen(false);
          }}
          user={user}
        />
      </div>

      {/* Mobile sidebar (slide-in with overlay) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex transition-transform duration-300 ease-in-out">
          <div className="w-72 bg-[#0f1724] h-full shadow-lg">
            <ChatList
              chats={chats}
              current={current}
              onSelect={(i) => {
                selectChat(i);
                setSidebarOpen(false);
              }}
              onNew={() => {
                createNewChat();
                setSidebarOpen(false);
              }}
              onEditTitle={(i, title) => editChatTitle(i, title)}
              onDelete={(i) => {
                deleteChat(i);
                setSidebarOpen(false);
              }}
              user={user}
              onRequestClose={() => setSidebarOpen(false)}
            />
          </div>
          <div
            className="flex-1 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Header (hidden on mobile when sidebar is open) */}
      {!sidebarOpen && (
        <header className="fixed md:left-72 md:w-[calc(100%-18rem)] lg:left-72 lg:w-[calc(100%-18rem)] xl:left-80 xl:w-[calc(100%-20rem)] left-0 right-0 top-0 h-14 bg-white border-b z-40">
          <div className="max-w-5xl mx-auto w-full h-full relative">
            <button
              type="button"
              className="md:hidden absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur px-3 py-2 rounded shadow"
              onClick={() => setSidebarOpen(true)}
            >
              <FaBars />
            </button>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-lg font-semibold">Gemini Chatbot</div>
            </div>
            <div className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 items-center text-sm text-slate-500 gap-3">
              {user && (
                <button
                  title={
                    temporaryNoSave
                      ? "Temporary mode: ON (chats won't be saved)"
                      : "Temporary mode: OFF"
                  }
                  className="px-2 py-1 rounded bg-white/0 hover:bg-gray-100 text-sm"
                  onClick={async () => {
                    const next = !temporaryNoSave;
                    setTemporaryNoSave(next);
                    try {
                      localStorage.setItem("noSave", next ? "true" : "false");
                    } catch {
                      // ignore storage errors
                    }
                    if (!next) {
                      // just turned OFF -> flush unsaved chats to server
                      await flushTemporaryChats();
                    }
                  }}
                >
                  {temporaryNoSave ? (
                    <span className="text-sky-600">Temporary: ON</span>
                  ) : (
                    <span>Temporary: OFF</span>
                  )}
                </button>
              )}
              <div>Model: Gemini</div>
            </div>
          </div>
        </header>
      )}

      {/* Main chat box (hidden when sidebar open on mobile) */}
      {!sidebarOpen && (
        <main className="md:pl-72 lg:pl-72 xl:pl-80 pt-14 pr-0">
          <div className="max-w-5xl mx-auto">
            <div className="min-h-[calc(100vh-14px-80px)] bg-white shadow-md rounded-md overflow-hidden mt-6">
              <ChatBox
                messages={chats[current]?.messages || []}
                loading={loading}
              />
            </div>
          </div>
        </main>
      )}

      {/* Chat input (hidden when sidebar open on mobile) */}
      {!sidebarOpen && (
        <div className="fixed md:left-72 lg:left-72 xl:left-80 left-0 right-0 bottom-0 bg-white border-t z-40">
          <div className="max-w-5xl mx-auto px-4 md:px-0 py-3">
            {/* attachments preview strip */}
            {attachments.length > 0 && (
              <div className="mb-2 overflow-x-auto flex gap-3">
                {attachments.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white border rounded-md px-3 py-2 min-w-[180px] flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
                      {/* basic icon by extension */}
                      {/[jJ][pP][gG]|[pP][nN][gG]|[wW][eE][bB][pP]/.test(
                        a.type
                      ) ? (
                        <FaFileImage />
                      ) : /pdf/i.test(a.type) ? (
                        <FaFilePdf />
                      ) : (
                        <FaFileAlt />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium truncate">
                        {a.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {a.sizeLabel}
                      </div>
                    </div>
                    <div className="w-12 flex flex-col items-center">
                      {a.status === "uploading" ? (
                        <div className="flex items-center justify-center">
                          {/* circular progress */}
                          <svg className="w-8 h-8" viewBox="0 0 36 36">
                            <path
                              d="M18 2a16 16 0 1 0 0 32 16 16 0 1 0 0-32"
                              fill="none"
                              stroke="#e5e7eb"
                              strokeWidth="4"
                            />
                            <path
                              d="M18 2a16 16 0 0 1 0 32"
                              fill="none"
                              stroke="#06b6d4"
                              strokeWidth="4"
                              strokeDasharray={`${a.progress},100`}
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">Done</div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        // revoke URL and remove
                        if (a.url) URL.revokeObjectURL(a.url);
                        setAttachments((prev) =>
                          prev.filter((x) => x.id !== a.id)
                        );
                      }}
                      className="text-red-500 ml-2"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="h-16 flex items-center">
              <ChatInput
                onSend={handleSend}
                onFilesSelected={handleFilesSelected}
                showUpload={!!user}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
