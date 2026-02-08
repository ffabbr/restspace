"use client";

import { useEffect, useState, useCallback } from "react";

interface Thought {
  id: number;
  content: string;
  font: string;
  category: string;
  created_at: string;
}

export type Category = "all" | "thought" | "diary" | "aspiration";

function fontClass(font: string) {
  if (font === "serif") return "font-serif";
  if (font === "mono") return "font-mono";
  return "font-sans-serif";
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function ThoughtFeed({
  refreshKey,
  filter,
}: {
  refreshKey: number;
  filter: Category;
}) {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchThoughts = useCallback(async () => {
    try {
      const res = await fetch("/api/thoughts");
      if (res.ok) {
        const data = await res.json();
        setThoughts(data);
      }
    } catch (e) {
      console.error("Failed to fetch thoughts:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThoughts();
  }, [fetchThoughts, refreshKey]);

  useEffect(() => {
    const interval = setInterval(fetchThoughts, 15000);
    return () => clearInterval(interval);
  }, [fetchThoughts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
      </div>
    );
  }

  if (thoughts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[var(--muted)] text-sm italic">
          no thoughts yet. be the first.
        </p>
      </div>
    );
  }

  const hasVisible = thoughts.some(
    (t) => filter === "all" || t.category === filter
  );

  return (
    <div>
      {!hasVisible && (
        <div className="flex items-center justify-center py-20">
          <p className="text-[var(--muted)] text-sm italic">
            {filter === "diary"
              ? "no diary entries yet."
              : `no ${filter}s yet.`}
          </p>
        </div>
      )}
      <div className="space-y-0">
        {thoughts.map((thought) => {
          const visible = filter === "all" || thought.category === filter;

          return (
            <div
              key={thought.id}
              className="thought-item border-b border-[var(--border)] last:border-b-0"
              style={{
                opacity: visible ? 1 : 0,
                maxHeight: visible ? "1000px" : "0px",
                paddingTop: visible ? "1.25rem" : "0",
                paddingBottom: visible ? "1.25rem" : "0",
                transform: visible ? "translateY(0)" : "translateY(-8px)",
                transition:
                  "opacity 0.3s ease, max-height 0.4s ease, padding 0.3s ease, transform 0.3s ease",
                overflow: "hidden",
                borderColor: visible ? undefined : "transparent",
              }}
            >
              <p
                className={`text-[var(--text)] leading-relaxed whitespace-pre-wrap break-words text-[15px] ${fontClass(
                  thought.font
                )}`}
              >
                {thought.content}
              </p>
              <time className="block mt-2 text-xs text-[var(--muted)]">
                {formatDate(thought.created_at)}
              </time>
            </div>
          );
        })}
      </div>
    </div>
  );
}
