"use client";

import { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <div className="font-sans-serif" style={{ minHeight: "100dvh" }}>
      {children}
    </div>
  );
}
