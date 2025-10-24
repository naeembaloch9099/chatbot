import React, { useRef, useEffect, useState } from "react";
import { FaPaperPlane, FaUpload } from "react-icons/fa";

export default function ChatInput({
  onSend = () => {},
  prefill = "",
  onFilesSelected = () => {},
  showUpload = true,
  disabled = false,
}) {
  const [value, setValue] = useState(prefill || "");
  const taRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    setValue(prefill || "");
  }, [prefill]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const maxH = 120;
    const newH = Math.min(maxH, ta.scrollHeight);
    ta.style.height = newH + "px";
    ta.style.overflowY = ta.scrollHeight > maxH ? "auto" : "hidden";
  }, [value]);

  const submit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  const onFiles = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // forward FileList to parent as an array
    const arr = Array.from(files);
    onFilesSelected(arr);
    // clear input so same file can be selected again if needed
    e.target.value = null;
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Handle paste event for files/images
  const onPaste = (e) => {
    if (
      e.clipboardData &&
      e.clipboardData.files &&
      e.clipboardData.files.length > 0
    ) {
      const arr = Array.from(e.clipboardData.files);
      onFilesSelected(arr);
      e.preventDefault();
      return;
    }
    // allow normal text paste
  };

  return (
    <div className="w-full">
      {/* Fixed input bar approx 80px height */}
      <div className="h-20 bg-white border-t shadow-sm px-3 sm:px-4 flex items-center">
        <div className="w-full max-w-5xl mx-auto flex items-center gap-3">
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder="Send a message..."
            className="flex-1 resize-none h-12 px-3 py-2 sm:px-4 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
            disabled={disabled}
          />
          {/* Upload button - only show if showUpload is true */}
          {showUpload && (
            <>
              <input
                ref={fileRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={onFiles}
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => fileRef.current && fileRef.current.click()}
                className="w-10 h-10 bg-white border rounded-md flex items-center justify-center hover:bg-gray-50"
                aria-label="Attach files"
                title="Attach files"
              >
                <FaUpload />
              </button>
            </>
          )}

          <button
            onClick={submit}
            className={`w-12 h-12 rounded-md flex items-center justify-center ${
              disabled || !value.trim()
                ? "bg-gray-300 text-gray-400 cursor-not-allowed"
                : "bg-sky-600 text-white hover:bg-sky-700"
            }`}
            aria-label="Send"
            disabled={disabled || !value.trim()}
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  );
}
