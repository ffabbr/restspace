"use client";

import { useState } from "react";
import { ThoughtFeed, Category } from "@/components/ThoughtFeed";
import { InputBar } from "@/components/InputBar";
import { WelcomeModal } from "@/components/WelcomeModal";

const categories: { key: Category; label: string }[] = [
  { key: "all", label: "all" },
  { key: "thought", label: "thoughts" },
  { key: "diary", label: "diary" },
  { key: "aspiration", label: "aspirations" },
];

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [filter, setFilter] = useState<Category>("all");

  return (
    <main className="min-h-[100dvh]">
      <WelcomeModal />
      {/* Desktop sidebar — positioned to the left of centered content */}
      <div className="hidden md:block fixed top-12 left-0 w-[calc(50%-theme(maxWidth.2xl)/2-1rem)] z-30">
        <div className="flex justify-end pr-10">
          <div className="flex flex-col gap-1">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`text-left text-[13px] py-1 transition-all duration-200 ${
                  filter === c.key
                    ? "text-[var(--text)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-12 pb-12">
        <InputBar onPosted={() => setRefreshKey((k) => k + 1)} />
        {/* Mobile filter row */}
        <div className="flex items-center gap-1 mb-8 mt-4 md:hidden">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`px-3 py-1.5 rounded-full text-[13px] transition-all duration-200 ${
                filter === c.key
                  ? "bg-[var(--accent)] text-[var(--bg)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <ThoughtFeed refreshKey={refreshKey} filter={filter} />
      </div>
    </main>
  );
}
