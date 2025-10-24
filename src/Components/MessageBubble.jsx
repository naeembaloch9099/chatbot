import React from "react";
import { FaFilePdf, FaFileImage, FaFileAlt } from "react-icons/fa";

export default function MessageBubble({ role = "bot", text = "", files = [] }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`$
          {isUser ? "bg-sky-600 text-white" : "bg-gray-100 text-gray-900"}
        rounded-lg px-3 py-2 sm:px-4 sm:py-3 max-w-[90%] md:max-w-[70%] shadow-sm`}
      >
        {/* File preview section */}
        {Array.isArray(files) && files.length > 0 && (
          <div className="mb-2 flex flex-col gap-2">
            {files.map((f, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="inline-block w-6 h-6">
                  {/pdf/i.test(f.type) ? (
                    <FaFilePdf className="text-red-500" />
                  ) : /jpe?g|png|webp/i.test(f.type) ? (
                    <FaFileImage className="text-sky-500" />
                  ) : (
                    <FaFileAlt className="text-slate-500" />
                  )}
                </span>
                <span className="text-xs font-medium truncate max-w-[120px]">
                  {f.url ? (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {f.name}
                    </a>
                  ) : (
                    f.name
                  )}
                </span>
                <span className="text-xs text-slate-400">
                  {(f.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="whitespace-pre-wrap">{text}</div>
      </div>
    </div>
  );
}
