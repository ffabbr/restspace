"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface Thought {
  id: number;
  content: string;
  font: string;
  category: string;
  color: string;
  user_id: string | null;
  created_at: string;
}

const colorVars: Record<string, string | undefined> = {
  default: undefined,
  rose: "var(--color-rose)",
  blue: "var(--color-blue)",
};

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

function EditableThought({
  thought,
  isOwner,
  isNew,
  visible,
  onUpdate,
}: {
  thought: Thought;
  isOwner: boolean;
  isNew: boolean;
  visible: boolean;
  onUpdate: (id: number, content: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(thought.content);
  const [saving, setSaving] = useState(false);
  const [initialHeight, setInitialHeight] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLParagraphElement>(null);

  function startEditing() {
    if (contentRef.current) {
      setInitialHeight(contentRef.current.offsetHeight);
    }
    setEditing(true);
  }

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      if (initialHeight) {
        el.style.height = initialHeight + "px";
      }
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing, initialHeight]);

  async function handleSave() {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === thought.content) {
      setEditing(false);
      setEditContent(thought.content);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/thoughts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: thought.id, content: trimmed }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(thought.id, updated.content);
        setEditing(false);
      }
    } catch {
      // keep editing on error
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
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
      {editing ? (
        <div>
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => {
              const val = e.target.value.replace(/\n{3,}/g, "\n\n");
              if (val.length <= 2000) setEditContent(val);
              setInitialHeight(null);
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setEditing(false);
                setEditContent(thought.content);
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSave();
              }
            }}
            className={`w-full bg-transparent text-[var(--text)] text-[15px] resize-none leading-relaxed focus:outline-none ${fontClass(thought.font)}`}
            style={colorVars[thought.color] ? { color: colorVars[thought.color] } : undefined}
            disabled={saving}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleSave}
              disabled={saving || !editContent.trim()}
              className="text-[11px] text-[var(--text)] hover:opacity-70 transition-opacity disabled:opacity-30"
            >
              {saving ? "saving..." : "save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditContent(thought.content);
              }}
              className="text-[11px] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="group">
          <p
            ref={contentRef}
            className={`text-[var(--text)] leading-relaxed whitespace-pre-wrap break-words text-[15px] ${fontClass(
              thought.font
            )}`}
            style={colorVars[thought.color] ? { color: colorVars[thought.color] } : undefined}
          >
            {thought.content}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <time className="text-xs text-[var(--muted)]">
              {formatDate(thought.created_at)}
            </time>
            {isOwner && (
              <button
                onClick={startEditing}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[var(--muted)] hover:text-[var(--text)]"
                aria-label="edit"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const knownIdsRef = useRef<Set<number>>(new Set());
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch session to know current user
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setCurrentUserId(data.userId ?? null))
      .catch(() => {});
  }, []);

  const handleUpdate = useCallback((id: number, content: string) => {
    setThoughts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, content } : t))
    );
  }, []);

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
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <p className="text-[var(--muted)] text-sm">
          nothing here yet. be the first.
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
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <p className="text-[var(--muted)] text-sm">
            {filter === "diary"
              ? "no diary entries yet"
              : `no ${filter}s yet`}
          </p>
        </div>
      )}
      <div className="space-y-0 px-[18px]">
        {thoughts.map((thought) => (
          <EditableThought
            key={thought.id}
            thought={thought}
            isOwner={!!currentUserId && thought.user_id === currentUserId}
            isNew={newIds.has(thought.id)}
            visible={filter === "all" || thought.category === filter}
            onUpdate={handleUpdate}
          />
        ))}
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
