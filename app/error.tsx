"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-[var(--muted)] text-sm mb-4">something went wrong</p>
        <button
          onClick={reset}
          className="text-[13px] px-4 py-2 rounded-full bg-[var(--surface)] text-[var(--text)] hover:opacity-80 transition-opacity"
        >
          try again
        </button>
      </div>
    </div>
  );
}
