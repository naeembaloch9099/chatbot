import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { showToast } from "../Services/Toast";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const BACKEND = import.meta.env.DEV
      ? ""
      : import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
    fetch(`${BACKEND}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })
      .then(async (r) => {
        // Log basic network response info for debugging (status + body)
        console.log("[Login] network response status:", r.status, r.statusText);
        const txt = await r.text().catch(() => "");
        console.log("[Login] network response body:", txt);
        let data = {};
        if (txt) {
          try {
            data = JSON.parse(txt);
          } catch {
            data = { error: txt };
          }
        }
        return { ok: r.ok, status: r.status, ...data };
      })
      .then((data) => {
        if (data && data.ok) {
          localStorage.setItem("isAuthenticated", "1");
          if (data.user && data.user.email)
            localStorage.setItem("userEmail", data.user.email);
          localStorage.setItem(
            "userName",
            (data.user && (data.user.name || data.user.email?.split("@")[0])) ||
              ""
          );
          console.log("[Login] success payload:", data);
          navigate("/chat");
          showToast({ message: "Logged in", type: "success", duration: 2000 });
        } else {
          console.log("[Login] failure payload:", data);
          if (data && data.errorId) {
            console.error(
              `[Login] server error id: ${data.errorId} file: ${data.file} message: ${data.error}`
            );
          }
          showToast({
            message: (data && data.error) || "Login failed",
            type: "error",
          });
        }
      })
      .catch((err) => {
        console.error("Login request failed:", err);
        showToast({
          message: "Network error. Please try again.",
          type: "error",
        });
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-800">Welcome Back</h1>
            <p className="text-sm text-slate-500 mt-1">
              Log in to continue to ChatBot
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl"
              placeholder="Email"
            />
            <input
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl"
              placeholder="Password"
              type="password"
            />
            <button className="w-full py-3 bg-sky-600 text-white rounded-xl">
              Log in
            </button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don't have an account?{" "}
            <Link to="/signup" className="text-sky-600">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
