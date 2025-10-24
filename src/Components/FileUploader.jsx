import React, { useState, useRef, useEffect } from "react";
import {
  FaUpload,
  FaFilePdf,
  FaFileAlt,
  FaFileCode,
  FaFileImage,
  FaFileAudio,
  FaFileVideo,
  FaFileArchive,
  FaFileExcel,
  FaFilePowerpoint,
  FaTimes,
} from "react-icons/fa";

// FileUploader: a self-contained React component that supports drag/drop and
// click-to-upload, validates files against per-type limits (simulated where
// full parsing isn't possible in-browser), and shows previews or icons.
export default function FileUploader({ onFilesChange }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [items, setItems] = useState([]); // { id, file, url, name, size, typeKey, meta }
  const [alerts, setAlerts] = useState([]);

  // Helper: friendly size
  const fmt = (n) => {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(2) + " MB";
  };

  // Allowed extensions grouped by logical type
  const typeDefs = {
    document: {
      exts: ["pdf", "docx", "doc", "txt", "html"],
      maxSize: 30 * 1024 * 1024, // 30 MB
      note: "Docs: max 30 MB or ~2000 pages (simulated)",
    },
    spreadsheet: {
      exts: ["xlsx", "csv"],
      maxSize: 20 * 1024 * 1024, // 20 MB
      note: "Sheets: max 20 MB or ~1,000,000 cells (simulated)",
    },
    presentation: {
      exts: ["pptx", "ppt"],
      maxSize: 35 * 1024 * 1024, // 35 MB
      note: "Slides: max 35 MB / ~500 slides (simulated)",
    },
    image: {
      exts: ["jpg", "jpeg", "png", "webp", "svg"],
      maxSize: 15 * 1024 * 1024, // 15 MB
      maxMP: 24_000_000, // 24 MP
      maxCount: 3,
    },
    audio: {
      exts: ["wav", "mp3", "flac"],
      maxSize: 40 * 1024 * 1024, // 40 MB
      maxDurationSec: 20 * 60, // ~20 min
    },
    video: {
      exts: ["mp4", "mov", "m4v"],
      maxSize: 200 * 1024 * 1024, // 200 MB
      maxDurationSec: 30 * 60, // 30 min
    },
    code: {
      exts: ["py", "js", "java", "cpp", "c", "html", "css"],
      maxSize: 10 * 1024 * 1024, // 10 MB
      maxLines: 25_000,
    },
    zip: {
      exts: ["zip"],
      maxSize: 150 * 1024 * 1024, // 150 MB
      maxItems: 100,
    },
  };

  // Build accept string for <input>
  const accept = Object.values(typeDefs)
    .flatMap((t) => t.exts)
    .map((e) => "." + e)
    .join(",");

  // Simple file type detection by extension
  function detectType(file) {
    const name = (file.name || "").toLowerCase();
    const ext = name.split(".").pop();
    for (const key of Object.keys(typeDefs)) {
      if (typeDefs[key].exts.includes(ext)) return key;
    }
    return "unknown";
  }

  // Add alert
  function pushAlert(msg) {
    setAlerts((a) => [...a, msg]);
    // auto-clear after 6s
    setTimeout(() => setAlerts((a) => a.slice(1)), 6000);
  }

  // Validate a single file. Returns a result object with valid flag and meta.
  async function validateFile(file, existingCounts = {}) {
    const typeKey = detectType(file);
    // If unknown type, reject
    if (typeKey === "unknown")
      return { valid: false, reason: "Unsupported file type" };

    const def = typeDefs[typeKey];
    if (!def) return { valid: false, reason: "Unknown file category" };

    // Basic size check
    if (file.size > def.maxSize) {
      return {
        valid: false,
        reason: `File too large: Max ${fmt(def.maxSize)} for ${typeKey}`,
      };
    }

    // Per-type additional simulated checks
    // Images: check resolution via Image element
    if (typeKey === "image") {
      // enforce max count
      const count = existingCounts.image || 0;
      if (def.maxCount && count >= def.maxCount) {
        return {
          valid: false,
          reason: `Image limit: Max ${def.maxCount} images allowed`,
        };
      }
      // check dimensions/resolution
      try {
        const url = URL.createObjectURL(file);
        const img = new Image();
        const prom = new Promise((res, rej) => {
          img.onload = () => res({ w: img.width, h: img.height });
          img.onerror = rej;
        });
        img.src = url;
        const { w, h } = await prom;
        URL.revokeObjectURL(url);
        const mp = w * h;
        if (mp > def.maxMP)
          return {
            valid: false,
            reason: `Image resolution too large: ${Math.round(
              mp / 1e6
            )} MP (max ${Math.round(def.maxMP / 1e6)} MP)`,
          };
        return { valid: true, typeKey, meta: { width: w, height: h } };
      } catch {
        // if image couldn't be loaded, reject
        return { valid: false, reason: "Failed to read image" };
      }
    }

    // Audio: get duration via audio element
    if (typeKey === "audio") {
      const url = URL.createObjectURL(file);
      try {
        const audio = document.createElement("audio");
        audio.preload = "metadata";
        audio.src = url;
        const dur = await new Promise((res, rej) => {
          audio.onloadedmetadata = () => res(audio.duration);
          audio.onerror = rej;
        });
        URL.revokeObjectURL(url);
        if (dur > def.maxDurationSec)
          return {
            valid: false,
            reason: `Audio too long: Max ${(def.maxDurationSec / 60).toFixed(
              0
            )} minutes`,
          };
        // simulate transcription by logging
        console.info(
          `Simulated transcription for ${file.name}: duration ${dur}s`
        );
        return { valid: true, typeKey, meta: { duration: dur } };
      } catch {
        URL.revokeObjectURL(url);
        return { valid: false, reason: "Failed to read audio metadata" };
      }
    }

    // Video: get duration via video element
    if (typeKey === "video") {
      const url = URL.createObjectURL(file);
      try {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = url;
        const dur = await new Promise((res, rej) => {
          video.onloadedmetadata = () => res(video.duration);
          video.onerror = rej;
        });
        URL.revokeObjectURL(url);
        if (dur > def.maxDurationSec)
          return {
            valid: false,
            reason: `Video too long: Max ${(def.maxDurationSec / 60).toFixed(
              0
            )} minutes`,
          };
        console.info(
          `Simulated key-frame analysis for ${file.name}: duration ${dur}s`
        );
        return { valid: true, typeKey, meta: { duration: dur } };
      } catch {
        URL.revokeObjectURL(url);
        return { valid: false, reason: "Failed to read video metadata" };
      }
    }

    // Code: read text and count lines
    if (typeKey === "code") {
      try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).length;
        if (lines > def.maxLines)
          return {
            valid: false,
            reason: `Code file too large: ${lines} lines (max ${def.maxLines})`,
          };
        // simple syntax tree simulation: just store length
        return { valid: true, typeKey, meta: { lines } };
      } catch {
        return { valid: false, reason: "Failed to read code file" };
      }
    }

    // Documents (pdf/docx/html/txt): simulate pages for non-text files
    if (typeKey === "document") {
      const name = (file.name || "").toLowerCase();
      const ext = name.split(".").pop();
      if (ext === "txt" || ext === "html") {
        try {
          const text = await file.text();
          // simulate page count: ~3000 chars per page
          const pages = Math.max(1, Math.ceil(text.length / 3000));
          if (pages > 2000)
            return {
              valid: false,
              reason: `Document too long: ${pages} pages (max 2000)`,
            };
          return {
            valid: true,
            typeKey,
            meta: { pages, textExtract: text.slice(0, 5000) },
          };
        } catch {
          return { valid: false, reason: "Failed to read document text" };
        }
      }
      // For PDF/DOCX we can't parse easily here: approximate page count via size
      const approxPages = Math.max(1, Math.round(file.size / (50 * 1024))); // rough: 50KB/page
      if (approxPages > 2000)
        return {
          valid: false,
          reason: `Document too large: approx ${approxPages} pages (max 2000)`,
        };
      console.info(
        `Simulated document extraction for ${file.name}: approx ${approxPages} pages`
      );
      return { valid: true, typeKey, meta: { pages: approxPages } };
    }

    // Spreadsheet: approximate cells via size
    if (typeKey === "spreadsheet") {
      const approxCells = Math.max(1, Math.round(file.size / 50)); // rough heuristic
      if (approxCells > 1_000_000)
        return {
          valid: false,
          reason: `Spreadsheet too large: approx ${approxCells} cells (max 1,000,000)`,
        };
      console.info(
        `Simulated spreadsheet flatten for ${file.name}: approx ${approxCells} cells (formulas noted)`
      );
      return { valid: true, typeKey, meta: { approxCells } };
    }

    // Presentation: approximate slides via size
    if (typeKey === "presentation") {
      const approxSlides = Math.max(1, Math.round(file.size / (100 * 1024))); // 100KB/slide
      if (approxSlides > 500)
        return {
          valid: false,
          reason: `Presentation too large: approx ${approxSlides} slides (max 500)`,
        };
      console.info(
        `Simulated slides extraction for ${file.name}: approx ${approxSlides} slides (speaker notes simulated)`
      );
      return { valid: true, typeKey, meta: { approxSlides } };
    }

    // Zip: simulate items count by size heuristic
    if (typeKey === "zip") {
      const approxItems = Math.max(
        1,
        Math.round(file.size / (1 * 1024 * 1024))
      ); // 1MB/item heuristic
      if (file.size > def.maxSize)
        return {
          valid: false,
          reason: `Zip too large: Max ${fmt(def.maxSize)}`,
        };
      if (approxItems > def.maxItems)
        return {
          valid: false,
          reason: `Zip contains too many items: approx ${approxItems} (max ${def.maxItems})`,
        };
      console.info(
        `Simulated unzip check for ${file.name}: approx ${approxItems} items`
      );
      return { valid: true, typeKey, meta: { approxItems } };
    }

    // Fallback: accept
    return { valid: true, typeKey, meta: {} };
  }

  // Handle files from input or drop
  async function handleFiles(fileList) {
    const arr = Array.from(fileList || []);
    if (arr.length === 0) return;

    // Count existing types for limits
    const counts = items.reduce((acc, it) => {
      acc[it.typeKey] = (acc[it.typeKey] || 0) + 1;
      return acc;
    }, {});

    for (const f of arr) {
      const res = await validateFile(f, counts);
      if (!res.valid) {
        pushAlert(`${f.name}: ${res.reason}`);
        continue;
      }
      // create preview URL for images/video/audio
      const url = URL.createObjectURL(f);
      const id =
        Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const entry = {
        id,
        file: f,
        url,
        name: f.name,
        size: f.size,
        sizeLabel: fmt(f.size),
        typeKey: res.typeKey,
        meta: res.meta || {},
      };
      setItems((prev) => [entry, ...prev]);
      counts[res.typeKey] = (counts[res.typeKey] || 0) + 1;
    }
  }

  // Remove item
  function removeItem(id) {
    setItems((prev) => {
      const removed = prev.find((p) => p.id === id);
      if (removed && removed.url) URL.revokeObjectURL(removed.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  // Effect: notify parent when files change
  useEffect(() => {
    if (onFilesChange) onFilesChange(items.map((i) => i.file));
  }, [items, onFilesChange]);

  // Cleanup on unmount: revoke all object URLs
  useEffect(() => {
    return () => {
      items.forEach((it) => it.url && URL.revokeObjectURL(it.url));
    };
  }, [items]);

  // Drag events
  function onDragOver(e) {
    e.preventDefault();
    setDragActive(true);
  }
  function onDragLeave(e) {
    e.preventDefault();
    setDragActive(false);
  }
  function onDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) handleFiles(dt.files);
  }

  // Keyboard accessibility: Enter/Space triggers file dialog
  function onKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  // Icon picker by type
  function IconForType(typeKey) {
    switch (typeKey) {
      case "document":
        return <FaFilePdf className="text-2xl" />;
      case "spreadsheet":
        return <FaFileExcel className="text-2xl" />;
      case "presentation":
        return <FaFilePowerpoint className="text-2xl" />;
      case "image":
        return <FaFileImage className="text-2xl" />;
      case "audio":
        return <FaFileAudio className="text-2xl" />;
      case "video":
        return <FaFileVideo className="text-2xl" />;
      case "code":
        return <FaFileCode className="text-2xl" />;
      case "zip":
        return <FaFileArchive className="text-2xl" />;
      default:
        return <FaFileAlt className="text-2xl" />;
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="File upload dropzone"
        onKeyDown={onKeyDown}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`border-2 rounded-md p-6 flex items-center justify-between gap-4 transition-colors ${
          dragActive
            ? "border-sky-500 bg-sky-50"
            : "border-dashed border-gray-300 bg-white"
        }`}
      >
        <div className="flex-1">
          <div className="text-sm text-slate-700 font-medium">Attach files</div>
          <div className="text-xs text-slate-500 mt-1">
            Drag & drop files here or click upload. Accepted: {accept}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept}
            onChange={(e) => handleFiles(e.target.files)}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => inputRef.current && inputRef.current.click()}
            className="px-3 py-2 bg-sky-600 text-white rounded flex items-center gap-2"
          >
            <FaUpload />
            <span className="text-sm">Upload</span>
          </button>
        </div>
      </div>

      {/* Alerts area */}
      <div className="mt-3">
        {alerts.map((a, i) => (
          <div key={i} className="text-sm text-red-600">
            {a}
          </div>
        ))}
      </div>

      {/* Uploaded files preview list */}
      <div className="mt-4 overflow-x-auto flex gap-3 py-2">
        {items.map((it) => (
          <div
            key={it.id}
            className="min-w-[220px] max-w-xs bg-white border rounded p-2 flex-shrink-0 shadow-sm"
          >
            <div className="flex items-start gap-2">
              <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center overflow-hidden">
                {it.typeKey === "image" ? (
                  <img
                    src={it.url}
                    alt={it.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="text-slate-600">
                    {IconForType(it.typeKey)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium truncate">{it.name}</div>
                <div className="text-xs text-slate-500">{it.sizeLabel}</div>
                {it.meta && it.meta.duration && (
                  <div className="text-xs text-slate-500">
                    Duration: {Math.round(it.meta.duration)}s
                  </div>
                )}
                {it.meta && it.meta.lines && (
                  <div className="text-xs text-slate-500">
                    Lines: {it.meta.lines}
                  </div>
                )}
              </div>
              <button
                aria-label={`Remove ${it.name}`}
                onClick={() => removeItem(it.id)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
