"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, type Lang } from "@/lib/i18n";

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl px-2.5 h-10 text-sm font-medium transition-colors hover:opacity-80"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
        title="Language / Bahasa"
      >
        <span>{current.flag}</span>
        <span className="hidden sm:inline uppercase text-xs">{current.code}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-xl overflow-hidden z-50 animate-fade-up"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
        >
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors"
              style={{
                background: lang === l.code ? "var(--surface-2)" : "transparent",
                fontWeight: lang === l.code ? 600 : 400,
              }}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {lang === l.code && (
                <span className="ml-auto" style={{ color: "var(--accent)" }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
