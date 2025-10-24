import React from "react";
import MessageBubble from "./MessageBubble";

// Static, responsive chat message container used by the pixel-perfect UI.
export default function ChatBox({ messages = [], loading = false }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Scrollable message area between top nav and bottom input.
      Add extra bottom padding so the last message stays visible above the
      fixed input bar (h-20 = 80px). Use responsive padding to keep a
      comfortable gap on small and large screens. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-28 sm:pb-32 space-y-4 bg-white">
        {messages.length === 0 && (
          <div className="text-center text-sm text-slate-400 pt-8">
            Start the conversation — say hi 👋
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            role={m.role}
            text={m.text}
            files={m.files || []}
          />
        ))}

        {loading && (
          <div className="text-sm text-slate-500 flex items-center gap-3">
            <svg
              className="w-4 h-4 animate-spin text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                className="opacity-25"
              />
              <path
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                fill="currentColor"
                className="opacity-75"
              />
            </svg>
            Assistant is composing a response...
          </div>
        )}
      </div>
    </div>
  );
}
