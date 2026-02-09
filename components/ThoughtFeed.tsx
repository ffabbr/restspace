"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface Thought {
  id: number;
  content: string;
  font: string;
  category: string;
  created_at: string;
}

export type Category = "all" | "thought" | "diary" | "aspiration";

const PAGE_SIZE = 30;

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const knownIdsRef = useRef<Set<number>>(new Set());
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch the latest page (initial load + refresh)
  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch(`/api/thoughts?limit=${PAGE_SIZE}`);
      if (res.ok) {
        const data: Thought[] = await res.json();
        const incoming = new Set(data.map((t) => t.id));
        const fresh = new Set<number>();
        if (knownIdsRef.current.size > 0) {
          for (const id of incoming) {
            if (!knownIdsRef.current.has(id)) fresh.add(id);
          }
        }
        knownIdsRef.current = incoming;
        if (fresh.size > 0) {
          setNewIds(fresh);
          setTimeout(() => setNewIds(new Set()), 600);
        }
        setThoughts(data);
        setHasMore(data.length >= PAGE_SIZE);
      }
    } catch (e) {
      console.error("Failed to fetch thoughts:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load next page using cursor
  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const lastId = thoughts[thoughts.length - 1]?.id;
      if (!lastId) return;
      const res = await fetch(`/api/thoughts?before=${lastId}&limit=${PAGE_SIZE}`);
      if (res.ok) {
        const data: Thought[] = await res.json();
        if (data.length > 0) {
          setThoughts((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const unique = data.filter((t) => !existingIds.has(t.id));
            return [...prev, ...unique];
          });
          for (const t of data) knownIdsRef.current.add(t.id);
        }
        setHasMore(data.length >= PAGE_SIZE);
      }
    } catch (e) {
      console.error("Failed to load more thoughts:", e);
    } finally {
      setLoadingMore(false);
    }
  }, [thoughts, loadingMore, hasMore]);

  // Initial load + refresh when new thought posted
  useEffect(() => {
    fetchLatest();
  }, [fetchLatest, refreshKey]);

  // Poll for new thoughts
  useEffect(() => {
    const interval = setInterval(fetchLatest, 15000);
    return () => clearInterval(interval);
  }, [fetchLatest]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMore]);

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

          const isNew = newIds.has(thought.id);

          return (
            <div
              key={thought.id}
              className={`thought-item border-b border-[var(--border)] last:border-b-0${isNew ? " thought-slide-in" : ""}`}
              style={{
                opacity: visible ? 1 : 0,
                maxHeight: visible ? "1000px" : "0px",
                paddingTop: visible ? "1.25rem" : "0",
                paddingBottom: visible ? "1.25rem" : "0",
                transform: visible ? "translateY(0)" : "translateY(-8px)",
                transition:
                  "opacity 0.3s ease, max-height 0.4s ease, padding 0.3s ease, transform 0.3s ease, border-bottom-width 0.3s ease",
                overflow: "hidden",
                borderBottomWidth: visible ? undefined : 0,
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

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <div className="flex items-center justify-center py-8">
          <div className="w-4 h-4 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
        </div>
      )}
    </div>
  );
}
