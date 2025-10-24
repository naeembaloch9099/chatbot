// services/Api.js
// Helper to resolve backend base URL. If VITE_BACKEND_URL points to localhost
// but the app is being accessed from another device (window.location.hostname),
// rewrite the hostname so API calls target the server machine instead of the
// client's localhost (which would be the phone/tablet).
function resolveBackend() {
  const envUrl = import.meta.env.VITE_BACKEND_URL ?? null;
  const dev = import.meta.env.DEV;
  let backend = envUrl ?? (dev ? "" : "http://localhost:4000");

  if (envUrl && typeof window !== "undefined") {
    try {
      const parsed = new URL(envUrl);
      const isLocalhost = ["localhost", "127.0.0.1"].includes(parsed.hostname);
      const hostIsRemote = !["localhost", "127.0.0.1"].includes(
        window.location.hostname
      );
      if (isLocalhost && hostIsRemote) {
        // replace localhost with the current client host (your PC's LAN IP when
        // you're accessing from a phone). Keep the original port.
        parsed.hostname = window.location.hostname;
        // strip trailing slash
        backend = parsed.toString().replace(/\/$/, "");
      }
    } catch {
      // if parsing fails, just fall back to the original value
    }
  }
  return backend;
}

export async function getGeminiResponse({ systemPrompt, conversation }) {
  // Use a relative URL in dev so Vite dev-server middleware/proxy handles /api/* routes
  // resolveBackend() will rewrite localhost to the current LAN host when needed.
  const BACKEND = resolveBackend();
  console.log(
    "[api client] Forwarding prompt to backend",
    BACKEND || "(relative) /api/gemini"
  );
  const res = await fetch(`${BACKEND}/api/gemini`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ systemPrompt, conversation }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("[api client] backend error body:", data);
    // Ensure we throw a readable error message, not [object Object]
    const errPayload = data?.error ?? data;
    const msg =
      typeof errPayload === "string" ? errPayload : JSON.stringify(errPayload);
    throw new Error(msg || "Backend error");
  }
  return data.response;
}

export async function saveMessage(message) {
  const BACKEND = resolveBackend();
  try {
    const headers = { "Content-Type": "application/json" };
    const res = await fetch(`${BACKEND}/api/messages`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("[api client] Failed to save message:", data);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("[api client] saveMessage error:", err);
    return null;
  }
}

export async function getMessages({ chatId, limit = 100 } = {}) {
  const BACKEND = resolveBackend();
  const params = new URLSearchParams();
  if (chatId) params.set("chatId", chatId);
  params.set("limit", String(limit));
  const res = await fetch(`${BACKEND}/api/messages?${params.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function getLatestMessageForChat(chatId) {
  const BACKEND = resolveBackend();
  const res = await fetch(
    `${BACKEND}/api/messages/latest/${encodeURIComponent(chatId)}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error("Failed to fetch latest message");
  return res.json();
}

export async function getChats() {
  const BACKEND = resolveBackend();
  const res = await fetch(`${BACKEND}/api/chats`, { credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error("[api client] getChats failed:", data);
    throw new Error("Failed to fetch chats");
  }
  return res.json();
}

export async function askWithFiles({ question, files = [] } = {}) {
  const BACKEND = resolveBackend();
  const fd = new FormData();
  fd.append("question", question || "");
  for (const f of files) {
    fd.append("files", f, f.name);
  }
  const res = await fetch(`${BACKEND}/api/ask-with-files`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("askWithFiles failed", data);
    throw new Error(data?.error || "askWithFiles failed");
  }
  return data;
}

export async function createChat({ title } = {}) {
  const BACKEND = resolveBackend();
  try {
    const headers = { "Content-Type": "application/json" };
    const res = await fetch(`${BACKEND}/api/chats`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("[api client] createChat failed:", data);
      return null;
    }
    return res.json();
  } catch (err) {
    console.error("[api client] createChat error:", err);
    return null;
  }
}

export async function deleteChat(chatId) {
  const BACKEND = resolveBackend();
  try {
    const res = await fetch(
      `${BACKEND}/api/chats/${encodeURIComponent(chatId)}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("[api client] deleteChat failed:", data);
      return null;
    }
    return res.json();
  } catch (err) {
    console.error("[api client] deleteChat error:", err);
    return null;
  }
}

export async function updateChat(chatId, { title } = {}) {
  const BACKEND = resolveBackend();
  try {
    const headers = { "Content-Type": "application/json" };
    const res = await fetch(
      `${BACKEND}/api/chats/${encodeURIComponent(chatId)}`,
      {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({ title }),
      }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("[api client] updateChat failed:", data);
      return null;
    }
    return res.json();
  } catch (err) {
    console.error("[api client] updateChat error:", err);
    return null;
  }
}

export async function checkAuthStatus() {
  const BACKEND = resolveBackend();
  try {
    const res = await fetch(`${BACKEND}/api/auth/me`, {
      credentials: "include",
    });
    if (!res.ok) {
      return { authenticated: false };
    }
    const data = await res.json();
    return { authenticated: true, user: data.user };
  } catch (err) {
    console.error("[api client] checkAuthStatus error:", err);
    return { authenticated: false };
  }
}
