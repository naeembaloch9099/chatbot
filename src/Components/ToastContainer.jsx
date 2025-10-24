import React, { useEffect, useState, useRef } from "react";
import toastEmitter from "../Services/Toast";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaTimes,
} from "react-icons/fa";

function IconFor({ type }) {
  const base = "w-6 h-6 drop-shadow-lg animate-pulse-slow";
  if (type === "success")
    return <FaCheckCircle className={`${base} text-emerald-400`} />;
  if (type === "error")
    return <FaTimesCircle className={`${base} text-rose-400`} />;
  return <FaInfoCircle className={`${base} text-sky-400`} />;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const handler = (e) => {
      const { message, type = "info", duration = 3500 } = e.detail;
      const id = Date.now() + Math.random();
      const toast = {
        id,
        message,
        type,
        duration,
        show: false,
        translateY: 0,
        progress: "100%",
      };

      setToasts((t) => [...t, toast]);
      setTimeout(
        () =>
          setToasts((t) =>
            t.map((x) => (x.id === id ? { ...x, show: true } : x))
          ),
        20
      );
      setTimeout(
        () =>
          setToasts((t) =>
            t.map((x) => (x.id === id ? { ...x, progress: "0%" } : x))
          ),
        40
      );

      // Auto remove
      setTimeout(() => {
        setToasts((t) =>
          t.map((x) => (x.id === id ? { ...x, show: false } : x))
        );
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 400);
      }, duration + 200);
    };
    toastEmitter.addEventListener("toast", handler);
    return () => {
      mounted.current = false;
      toastEmitter.removeEventListener("toast", handler);
    };
  }, []);

  const remove = (id) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, show: false } : x)));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 400);
  };

  if (!toasts.length) return null;

  return (
    <div className="fixed right-6 bottom-6 z-[9999] flex flex-col gap-4 items-end sm:right-4 sm:bottom-4 max-w-[90vw]">
      {toasts.map((t) => {
        const glow =
          t.type === "success"
            ? "shadow-[0_0_30px_rgba(16,185,129,0.7)]"
            : t.type === "error"
            ? "shadow-[0_0_30px_rgba(244,63,94,0.7)]"
            : "shadow-[0_0_30px_rgba(56,189,248,0.7)]";

        const borderColor =
          t.type === "success"
            ? "border-emerald-400"
            : t.type === "error"
            ? "border-rose-400"
            : "border-sky-400";

        return (
          <div
            key={t.id}
            className={`relative transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] 
            scale-[0.95] ${
              t.show
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }
            backdrop-blur-xl bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/60
            border ${borderColor} text-white rounded-2xl p-4 shadow-xl ${glow}
            flex items-center gap-3 cursor-pointer hover:scale-[1.02] hover:-translate-y-1`}
            onClick={() => remove(t.id)}
          >
            {/* Floating shine overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/5 to-transparent opacity-30 blur-md pointer-events-none" />

            {/* Icon */}
            <div className="relative flex-shrink-0">
              <IconFor type={t.type} />
            </div>

            {/* Text */}
            <div className="flex-1 text-sm font-medium leading-snug">
              {t.message}
            </div>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                remove(t.id);
              }}
              className="text-white/70 hover:text-white transition"
            >
              <FaTimes />
            </button>

            {/* Progress Bar */}
            <div className="absolute left-0 bottom-0 h-[3px] rounded-full overflow-hidden w-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shine"
                style={{
                  width: t.progress || "100%",
                  transition: `width ${t.duration}ms linear`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
