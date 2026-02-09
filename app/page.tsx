"use client";

import { useState, useRef, useEffect } from "react";
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

  const desktopFilterRef = useRef<HTMLDivElement>(null);
  const mobileFilterRef = useRef<HTMLDivElement>(null);
  const [desktopPill, setDesktopPill] = useState({ top: 0, height: 0, opacity: 0 });
  const [mobilePill, setMobilePill] = useState({ left: 0, width: 0, opacity: 0 });

  const activeIndex = categories.findIndex((c) => c.key === filter);

  useEffect(() => {
    const updatePills = () => {
      const dc = desktopFilterRef.current;
      if (dc) {
        const buttons = dc.querySelectorAll<HTMLButtonElement>("[data-filter]");
        const btn = buttons[activeIndex];
        if (btn) {
          setDesktopPill({ top: btn.offsetTop, height: btn.offsetHeight, opacity: 1 });
        }
      }
      const mc = mobileFilterRef.current;
      if (mc) {
        const buttons = mc.querySelectorAll<HTMLButtonElement>("[data-filter]");
        const btn = buttons[activeIndex];
        if (btn) {
          setMobilePill({ left: btn.offsetLeft, width: btn.offsetWidth, opacity: 1 });
        }
      }
    };
    updatePills();
  }, [activeIndex]);

  return (
    <main className="min-h-[100dvh]">
      <WelcomeModal />
      {/* Desktop sidebar — positioned to the left of centered content */}
      <div className="hidden md:block fixed top-12 left-0 w-[calc(50%-theme(maxWidth.2xl)/2-1rem)] z-30">
        <div className="flex justify-end pr-10">
          <div ref={desktopFilterRef} className="relative flex flex-col gap-1">
            <div
              className="absolute left-0 right-0 bg-[var(--pill-bg)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ top: desktopPill.top, height: desktopPill.height, opacity: desktopPill.opacity }}
            />
            {categories.map((c) => (
              <button
                key={c.key}
                data-filter
                onClick={() => setFilter(c.key)}
                className={`relative z-10 text-left text-[13px] py-1.5 px-3 rounded-full transition-colors duration-200 ${
                  filter === c.key
                    ? "text-[var(--pill-text)]"
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
        {/* InputBar + mobile filters: sticky on mobile, normal flow on desktop */}
        <div className="sticky top-0 z-40 bg-[var(--bg)] md:static md:bg-transparent">
          <InputBar onPosted={() => setRefreshKey((k) => k + 1)} />
          <div ref={mobileFilterRef} className="relative flex items-center gap-1 pb-4 md:hidden">
            <div
              className="absolute top-0 bg-[var(--pill-bg)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{
                left: mobilePill.left,
                width: mobilePill.width,
                height: "calc(100% - 1rem)",
                opacity: mobilePill.opacity,
              }}
            />
            {categories.map((c) => (
              <button
                key={c.key}
                data-filter
                onClick={() => setFilter(c.key)}
                className={`relative z-10 px-3 py-1.5 rounded-full text-[13px] transition-colors duration-200 ${
                  filter === c.key
                    ? "text-[var(--pill-text)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <ThoughtFeed refreshKey={refreshKey} filter={filter} />
      </div>
    </main>
  );
}
