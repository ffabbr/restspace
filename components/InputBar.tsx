"use client";

import { useState, useRef, useEffect } from "react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

const MAX_LENGTH = 2000;
type Font = "sans-serif" | "serif" | "mono";
type Category = "thought" | "diary" | "aspiration";

interface InputBarProps {
  onPosted: () => void;
}

export function InputBar({ onPosted }: InputBarProps) {
  const [content, setContent] = useState("");
  const [font, setFont] = useState<Font>("sans-serif");
  const [category, setCategory] = useState<Category>("thought");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [content]);

  async function authenticate(): Promise<boolean> {
    try {
      const loginOptsRes = await fetch("/api/auth/login-options", { method: "POST" });
      const loginOpts = await loginOptsRes.json();
      const loginResult = await startAuthentication({ optionsJSON: loginOpts });
      const verifyRes = await fetch("/api/auth/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginResult),
      });
      if (verifyRes.ok) return true;
      return false;
    } catch (e: unknown) {
      const name = e instanceof Error ? e.name : "";
      if (name !== "NotAllowedError" && name !== "AbortError") {
        console.error("Login error:", e);
      }
    }

    try {
      const regOptsRes = await fetch("/api/auth/register-options", { method: "POST" });
      const regOpts = await regOptsRes.json();
      const regResult = await startRegistration({ optionsJSON: regOpts });
      const verifyRes = await fetch("/api/auth/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regResult),
      });
      if (verifyRes.ok) return true;
    } catch (e) {
      console.error("Registration failed:", e);
    }

    return false;
  }

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError("");

    try {
      let res = await fetch("/api/thoughts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, font, category }),
      });

      if (res.status === 401) {
        const authed = await authenticate();
        if (!authed) {
          setError("authentication required");
          setSending(false);
          return;
        }

        res = await fetch("/api/thoughts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed, font, category }),
        });
      }

      if (res.ok) {
        setContent("");
        onPosted();
      } else {
        setError("something went wrong");
      }
    } catch {
      setError("connection failed");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const fontCls = font === "serif" ? "font-serif" : font === "mono" ? "font-mono" : "font-sans-serif";

  return (
    <div className="z-40">
      <div className="pt-3 pb-3">
        {error && (
          <p className="text-center text-xs text-[var(--muted)] mb-2">{error}</p>
        )}
        <div className="rounded-full bg-[var(--input-bg)] shadow-lg transition-all duration-200">
          <div className="flex items-end gap-3 pl-5 pr-[11px] py-2.5">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= MAX_LENGTH) {
                  setContent(e.target.value);
                  setError("");
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="what's on your mind?"
              rows={1}
              className={`flex-1 bg-transparent text-[var(--text)] placeholder-[var(--muted)]
                         text-[15px] resize-none leading-relaxed py-1
                         focus:outline-none ${fontCls}`}
              disabled={sending}
            />
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || sending}
              className="shrink-0 w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--bg)]
                         flex items-center justify-center transition-all duration-200
                         hover:opacity-80 disabled:opacity-20 disabled:cursor-default"
              aria-label="send"
            >
              {sending ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 px-2 pt-2">
          <div className="flex items-center gap-1">
            {(["thought", "diary", "aspiration"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-2.5 py-1 rounded-full text-[11px] transition-all duration-150 ${
                  category === c
                    ? "bg-[var(--accent)] text-[var(--bg)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {(["sans-serif", "serif", "mono"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFont(f)}
                className={`px-2 py-1 rounded-full text-[11px] transition-all duration-150 ${
                  font === f
                    ? "bg-[var(--accent)] text-[var(--bg)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                } ${f === "serif" ? "font-serif" : f === "mono" ? "font-mono" : "font-sans-serif"}`}
              >
                {f === "sans-serif" ? "sans" : f}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
