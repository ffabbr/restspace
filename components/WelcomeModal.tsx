"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "restspace_welcomed";

const pages = [
  {
    title: "a quiet place to think",
    description:
      "welcome to a minimal space for sharing thoughts, reflections, and affirmations. no likes, no followers, just words.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
  },
  {
    title: "make it yours",
    description:
      "choose between thoughts, diary entries, and affirmations. pick a font that fits your mood. sans-serif, serif, or mono.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    title: "secure & simple",
    description:
      "sign in with a passkey. no passwords, no emails. your identity stays on your device. just tap and you're in.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

export function WelcomeModal() {
  const [visible, setVisible] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const isLast = page === pages.length - 1;
  const current = pages[page];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[360px] max-w-[calc(100vw-2rem)] bg-[var(--input-bg)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="px-8 pt-10 pb-6 flex flex-col items-center text-center">
          <div className="text-[var(--muted)] mb-5">{current.icon}</div>
          <h2 className="text-[17px] font-medium text-[var(--text)] mb-3">
            {current.title}
          </h2>
          <p className="text-[14px] leading-relaxed text-[var(--muted)]">
            {current.description}
          </p>
        </div>

        <div className="flex items-center justify-between px-8 pb-8">
          {/* Page dots */}
          <div className="flex gap-1.5">
            {pages.map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  i === page
                    ? "bg-[var(--text)] w-4"
                    : "bg-[var(--border)] hover:bg-[var(--muted)]"
                }`}
                aria-label={`page ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {!isLast && (
              <button
                onClick={dismiss}
                className="text-[13px] text-[var(--muted)] hover:text-[var(--text)] transition-colors duration-150"
              >
                skip
              </button>
            )}
            <button
              onClick={isLast ? dismiss : () => setPage((p) => p + 1)}
              className="px-4 py-1.5 rounded-full text-[13px] bg-[var(--accent)] text-[var(--bg)]
                         hover:opacity-80 transition-all duration-200"
            >
              {isLast ? "get started" : "next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
