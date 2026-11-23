"use client";

import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Markdown } from "./Markdown";

type Tab = "write" | "preview";
const TABS: Tab[] = ["write", "preview"];

/** What a formatting button does to the selection: wrap it, or mark the start of each selected line. */
type Format =
  | { kind: "wrap"; before: string; after: string; empty: string }
  | { kind: "line"; mark: (n: number) => string; test: RegExp };

type Tool = { id: string; label: string; keys?: string; format: Format; icon: ReactNode };

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const TOOLS: Tool[][] = [
  [
    { id: "bold", label: "Bold", keys: "b", format: { kind: "wrap", before: "**", after: "**", empty: "bold text" }, icon: svg(<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />) },
    { id: "italic", label: "Italic", keys: "i", format: { kind: "wrap", before: "_", after: "_", empty: "italic text" }, icon: svg(<path d="M10 5h8M6 19h8M14 5l-4 14" />) },
    { id: "heading", label: "Heading", format: { kind: "line", mark: () => "### ", test: /^#{1,3}\s+/ }, icon: svg(<path d="M6 5v14M18 5v14M6 12h12" />) },
  ],
  [
    { id: "bullets", label: "Bulleted list", format: { kind: "line", mark: () => "- ", test: /^\s*[-*]\s+/ }, icon: svg(<><path d="M10 6h10M10 12h10M10 18h10" /><circle cx="5" cy="6" r="1" fill="currentColor" /><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="5" cy="18" r="1" fill="currentColor" /></>) },
    { id: "numbers", label: "Numbered list", format: { kind: "line", mark: (n) => `${n}. `, test: /^\s*\d+\.\s+/ }, icon: svg(<><path d="M10 6h10M10 12h10M10 18h10" /><path d="M4 4.5l1.5-1V8M4 8h3M4 14.5a1.5 1.5 0 0 1 3 0c0 1.2-3 2-3 3.5h3" /></>) },
    { id: "quote", label: "Quote", format: { kind: "line", mark: () => "> ", test: /^>\s?/ }, icon: svg(<path d="M5 6v12M10 8h9M10 12h9M10 16h6" />) },
  ],
  [
    { id: "link", label: "Link", keys: "k", format: { kind: "wrap", before: "[", after: "](https://)", empty: "link text" }, icon: svg(<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />) },
    { id: "code", label: "Code", format: { kind: "wrap", before: "`", after: "`", empty: "code" }, icon: svg(<path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />) },
  ],
];

const ALL_TOOLS = TOOLS.flat();

/**
 * Applies a format to the text box's selection and returns the new text and selection.
 * Wrapping twice unwraps; marking lines that already carry the mark removes it.
 */
function apply(text: string, start: number, end: number, f: Format): { text: string; start: number; end: number } {
  if (f.kind === "wrap") {
    const sel = text.slice(start, end);
    const outside = text.slice(start - f.before.length, start) === f.before && text.slice(end, end + f.after.length) === f.after;
    if (sel && outside) {
      return { text: text.slice(0, start - f.before.length) + sel + text.slice(end + f.after.length), start: start - f.before.length, end: end - f.before.length };
    }
    const inner = sel || f.empty;
    const next = text.slice(0, start) + f.before + inner + f.after + text.slice(end);
    // A new link selects the "https://" so the address can be typed straight over it.
    if (f.after.startsWith("](") && sel) {
      const urlAt = start + f.before.length + inner.length + 2;
      return { text: next, start: urlAt, end: urlAt + "https://".length };
    }
    return { text: next, start: start + f.before.length, end: start + f.before.length + inner.length };
  }
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = text.indexOf("\n", end) === -1 ? text.length : text.indexOf("\n", end);
  const lines = text.slice(lineStart, lineEnd).split("\n");
  const all = lines.every((l) => !l.trim() || f.test.test(l));
  const changed = lines.map((l, i) => (all ? l.replace(f.test, "") : f.mark(i + 1) + l.replace(/^(#{1,3}\s+|\s*[-*]\s+|\s*\d+\.\s+|>\s?)/, ""))).join("\n");
  return { text: text.slice(0, lineStart) + changed + text.slice(lineEnd), start: lineStart, end: lineStart + changed.length };
}

/** A roomy text box with Write and Preview tabs. What you type is plain markdown. */
export function MarkdownTextarea({
  label,
  hideLabel = false,
  name,
  value,
  onChange,
  rows = 10,
  placeholder,
  hint,
  error,
  required = false,
  maxLength,
}: {
  label: string;
  /** Keep the label for screen readers only (use when a heading right above already says it). */
  hideLabel?: boolean;
  name: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  maxLength?: number;
}) {
  const id = useId();
  const [tab, setTab] = useState<Tab>("write");
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const box = useRef<HTMLTextAreaElement | null>(null);

  function format(f: Format) {
    const el = box.current;
    if (!el) return;
    const r = apply(value, el.selectionStart, el.selectionEnd, f);
    if (maxLength && r.text.length > maxLength) return;
    onChange(r.text);
    // Put the cursor back on the changed text once React has written the new value.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(r.start, r.end);
    });
  }

  // Ctrl or Cmd with B, I or K, as in most writing apps.
  function onBoxKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    const tool = ALL_TOOLS.find((t) => t.keys === e.key.toLowerCase());
    if (!tool) return;
    e.preventDefault();
    format(tool.format);
  }
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

  // Arrow keys, Home and End move between the two tabs, as people expect from tabs.
  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    let next: Tab | undefined;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") next = tab === "write" ? "preview" : "write";
    else if (e.key === "Home") next = "write";
    else if (e.key === "End") next = "preview";
    if (!next) return;
    e.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="field md-field" style={{ "--rows": rows } as CSSProperties}>
      <div className="md-top">
        <label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
          {label}
          {required && <span className="req" aria-hidden="true"> *</span>}
        </label>
        <div className="segmented md-tabs" role="tablist" aria-label={`${label}: write or preview`}>
          {TABS.map((t) => (
            <button
              key={t}
              ref={(el) => {
                tabRefs.current[t] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${t}`}
              aria-selected={tab === t}
              aria-controls={`${id}-panel-${t}`}
              tabIndex={tab === t ? 0 : -1}
              onClick={() => setTab(t)}
              onKeyDown={onTabKey}
            >
              {t === "write" ? "Write" : "Preview"}
            </button>
          ))}
        </div>
      </div>
      {/* The text box stays in the page while previewing, so its value is always sent with the form. */}
      <div role="tabpanel" id={`${id}-panel-write`} aria-labelledby={`${id}-tab-write`} hidden={tab !== "write"} className="md-write">
        <div className="md-tools" role="toolbar" aria-label={`Format ${label.toLowerCase()}`} aria-controls={id}>
          {TOOLS.map((group, g) => (
            <div className="md-tool-group" key={g}>
              {group.map((t) => {
                const tip = t.keys ? `${t.label} (Ctrl or ⌘ ${t.keys.toUpperCase()})` : t.label;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="md-tool"
                    aria-label={tip}
                    title={tip}
                    // Keep the selection in the text box while clicking a button.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => format(t.format)}
                  >
                    {t.icon}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <textarea
          ref={box}
          onKeyDown={onBoxKey}
          id={id}
          name={name}
          className="input md-input"
          rows={rows}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel-preview`}
        aria-labelledby={`${id}-tab-preview`}
        className="md-preview"
        hidden={tab !== "preview"}
      >
        {tab === "preview" && (value.trim() ? <Markdown text={value} /> : <p className="faint">Nothing to preview yet.</p>)}
      </div>
      {hint && <span className="hint" id={`${id}-hint`}>{hint}</span>}
      {error && <span className="error" id={`${id}-error`} role="alert">{error}</span>}
    </div>
  );
}
