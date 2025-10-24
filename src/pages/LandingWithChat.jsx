import React, { useState } from "react";
import ChatBox from "../Components/ChatBox";
import ChatInput from "../Components/Chatinput";
import { showToast } from "../Services/Toast";

export default function LandingWithChat() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Welcome — this is guest mode. Responses come directly from Gemini 2.5 Flash.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const callGeminiDirect = async (prompt) => {
    const GEMINI_API_KEY = "AIzaSyD97SkBtO1ArN9mRos6VHz715w-SNsFBLw";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error?.message || "Gemini API request failed");

    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
  };

  const handleSend = async (text) => {
    if (!text?.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);

    try {
      const reply = await callGeminiDirect(text);
      setMessages((m) => [...m, { role: "bot", text: reply }]);
      showToast({ message: "Response received", type: "success" });
    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        { role: "bot", text: `Error: ${err.message}` },
      ]);
      showToast({ message: `Error: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-slate-800">
      {/* 🧭 Sticky top navbar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b z-50">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="text-xl font-semibold text-sky-700">Gemini</div>
            <div className="hidden sm:block text-sm text-slate-500">▼</div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="px-3 py-1 rounded text-sm text-sky-600 hover:underline"
            >
              Log in
            </a>
            <a
              href="/signup"
              className="px-3 py-1 rounded bg-sky-600 text-white text-sm hover:bg-sky-700"
            >
              Sign up for free
            </a>
          </div>
        </div>
      </header>

      {/* 💬 Main chat area between header and input */}
      <main className="flex-1 pt-14 pb-20 flex justify-center items-stretch">
        <div className="w-full max-w-3xl flex flex-col bg-white md:rounded-xl md:shadow-md overflow-hidden">
          {/* Title bar */}
          <div className="p-4 border-b">
            <h1 className="text-lg font-semibold">
              Gemini 2.5 Flash (Guest Mode)
            </h1>
            <p className="text-sm text-slate-500">
              Responses are fetched directly from Gemini API. For production,
              use a backend to hide the key.
            </p>
          </div>

          {/* Scrollable chat area */}
          <div className="flex-1 overflow-y-auto p-4">
            <ChatBox messages={messages} loading={loading} />
          </div>
        </div>
      </main>

      {/* ⌨️ Sticky input bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-50">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <ChatInput onSend={handleSend} />
        </div>
      </div>

      {/* 📄 Footer (optional, hidden on small screens) */}
      <footer className="hidden md:block mt-auto py-6 text-center text-xs text-slate-500 border-t">
        By messaging Gemini, you agree to our <a className="underline">Terms</a>{" "}
        and <a className="underline">Privacy Policy</a>.
      </footer>
    </div>
  );
}
