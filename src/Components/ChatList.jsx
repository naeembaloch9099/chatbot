import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaPlus, FaRobot } from "react-icons/fa";
import { showToast } from "../Services/Toast";

export default function ChatList({
  chats = [],
  current = 0,
  onSelect = () => {},
  onNew = () => {},
  onEditTitle = () => {},
  onDelete = () => {},
  user = null,
  onRequestClose = null,
}) {
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const menuRef = useRef(null);
  const menuPortalRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close menus on outside click or Esc
  useEffect(() => {
    const onDoc = (e) => {
      const clickedInsideMenuButton =
        menuRef.current && menuRef.current.contains(e.target);
      const clickedInsideMenuPortal =
        menuPortalRef.current && menuPortalRef.current.contains(e.target);

      if (!clickedInsideMenuButton && !clickedInsideMenuPortal)
        setOpenMenu(null);

      if (profileRef.current && !profileRef.current.contains(e.target))
        setProfileOpen(false);
    };

    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setEditing(null);
        setConfirmDelete(null);
        setProfileOpen(false);
      }
    };

    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Responsive: use full width on mobile, fixed width on desktop
  return (
    <div className="h-full bg-[#0f1724] text-white flex flex-col min-h-0 md:w-72 xl:w-80 w-full max-w-full">
      {/* HEADER */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
            <FaRobot />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Gemini</div>
            <div className="text-xs text-slate-300/70">Chat</div>
          </div>
        </div>

        {/* Right: Close button (mobile) */}
        {onRequestClose && (
          <button
            className="md:hidden text-slate-300/80 px-2 py-1 text-lg"
            onClick={(e) => {
              e.stopPropagation();
              onRequestClose();
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* SEARCH + NEW CHAT BUTTON */}
      <div className="px-4 py-3 sticky top-0 bg-[#0f1724] z-30 border-b border-white/5 flex flex-col gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats..."
          className="w-full px-2 py-1 rounded bg-white/10 text-white placeholder-slate-300/70 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <button
          onClick={onNew}
          className="w-full bg-white/10 hover:bg-white/15 rounded-md py-2 flex items-center justify-center gap-2 transition"
        >
          <FaPlus /> <span className="text-sm">New Chat</span>
        </button>
      </div>

      {/* CHAT LIST */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {chats
          .map((c, i) => ({ ...c, _index: i }))
          .filter((c) => {
            if (!search.trim()) return true;
            const s = search.toLowerCase();
            return (
              (c.title && c.title.toLowerCase().includes(s)) ||
              (c.messages &&
                c.messages.some(
                  (m) => m.text && m.text.toLowerCase().includes(s)
                ))
            );
          })
          .map((c, i) => (
            <div
              key={c.id || c._index}
              className={`px-3 py-2 rounded-md mx-2 flex items-center justify-between gap-2 truncate ${
                c._index === current ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <div
                className="flex-1 truncate"
                onClick={() => onSelect(c._index)}
              >
                {editing === i ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 px-2 py-1 rounded text-sm text-black"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                    />
                    <button
                      className="px-2 py-1 bg-sky-600 text-white rounded text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTitle(i, editValue);
                        setEditing(null);
                      }}
                    >
                      Save
                    </button>
                    <button
                      className="px-2 py-1 bg-gray-200 text-black rounded text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="cursor-pointer truncate">
                    {c.title ||
                      c.messages?.[0]?.text?.slice(0, 40) ||
                      "New chat"}
                  </div>
                )}
              </div>

              {/* Chat Menu */}
              <div className="relative" ref={menuRef}>
                {confirmDelete === i ? (
                  <div className="flex items-center gap-2">
                    <button
                      className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(i);
                        setConfirmDelete(null);
                      }}
                    >
                      Delete
                    </button>
                    <button
                      className="px-2 py-1 bg-gray-200 text-black rounded text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="p-1 text-white hover:text-slate-200 hover:bg-white/10 rounded"
                      aria-label="chat menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        if (openMenu && openMenu.index === i) setOpenMenu(null);
                        else setOpenMenu({ index: i, rect });
                      }}
                    >
                      •••
                    </button>
                    {openMenu &&
                      openMenu.index === i &&
                      createPortal(
                        <div
                          ref={(el) => (menuPortalRef.current = el)}
                          className="fixed bg-white text-black rounded shadow-lg z-50 ring-1 ring-black/10"
                          style={{
                            left: Math.max(8, openMenu.rect.left),
                            top: openMenu.rect.bottom + 8,
                            width: 176,
                          }}
                        >
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditValue(c.title || "");
                              setEditing(i);
                              setOpenMenu(null);
                            }}
                          >
                            Edit title
                          </button>
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(i);
                              setOpenMenu(null);
                            }}
                          >
                            Delete chat
                          </button>
                        </div>,
                        document.body
                      )}
                  </>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* FOOTER */}
      <div className="mt-auto px-3 py-4 border-t border-white/10 bg-[#0f1724]">
        {user ? (
          <ProfileFooter
            user={user}
            open={profileOpen}
            setOpen={setProfileOpen}
            refProp={profileRef}
          />
        ) : (
          <div className="text-sm text-slate-300/70">Not signed in</div>
        )}
      </div>
    </div>
  );
}

function ProfileFooter({ user, open, setOpen, refProp }) {
  const toggle = (e) => {
    e?.stopPropagation();
    setOpen((s) => !s);
  };

  const doLogout = async () => {
    try {
      const BACKEND = import.meta.env.VITE_BACKEND_URL || "";
      await fetch(`${BACKEND}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => null);
    } catch (e) {
      console.warn("Logout error:", e);
    }

    showToast({ message: "Logged out", type: "success", duration: 1800 });
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-indigo-500 flex items-center justify-center text-white">
          {(user.name || "U").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 text-sm">
          <div className="font-medium">{user.name}</div>
          <div className="text-xs text-slate-300/70 truncate">{user.email}</div>
        </div>
        <button
          className="px-2 py-1 text-sm text-slate-300/80"
          onClick={toggle}
        >
          ⋯
        </button>
      </div>

      {open && (
        <div
          ref={refProp}
          className="absolute left-0 bottom-12 w-44 bg-white text-black rounded shadow-lg ring-1 ring-black/10 z-50"
        >
          <button className="w-full text-left px-3 py-2 hover:bg-gray-100">
            Help
          </button>
          <button
            className="w-full text-left px-3 py-2 hover:bg-gray-100"
            onClick={doLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
