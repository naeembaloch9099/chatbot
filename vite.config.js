import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "dev-api-middleware",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url?.split("?")[0];

          // ✅ Allow access from any device / origin
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
          res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization"
          );

          if (req.method === "OPTIONS") {
            res.statusCode = 200;
            res.end();
            return;
          }

          // ✅ Simple test route
          if (req.method === "GET" && url === "/api/hello") {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ message: "Hello from Vite Dev Server!" }));
            return;
          }

          // ✅ Gemini proxy route
          if (req.method === "POST" && url === "/api/gemini") {
            try {
              let body = "";
              for await (const chunk of req) body += chunk;
              const { prompt } = JSON.parse(body || "{}");

              const apiKey = server.config.env.VITE_GEMINI_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: "Missing API Key" }));
                return;
              }

              const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

              const forwardRes = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                }),
              });

              const forwardData = await forwardRes.json();

              if (!forwardRes.ok) {
                res.statusCode = forwardRes.status || 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: forwardData.error }));
                return;
              }

              const text =
                forwardData?.candidates?.[0]?.content?.parts?.[0]?.text ||
                "No response.";
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ response: text }));
              return;
            } catch (err) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          }

          next();
        });
      },
    },
  ],

  // ✅ This makes the dev server accessible on LAN (same Wi-Fi, mobile, etc.)
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://192.168.18.204:4000", // your PC’s local IP (backend running on 4000)
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
