"use client";

import { useState } from "react";

/**
 * Copies rich content (HTML) so that pasting into Gmail inserts a real picture or
 * a real clickable link, not code. Falls back to selecting a hidden element and
 * using the browser's copy command where the Clipboard API can't write HTML.
 */
async function copyRich(html: string, plain: string) {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return true;
    }
  } catch {
    /* fall through */
  }
  const holder = document.createElement("div");
  holder.contentEditable = "true";
  holder.innerHTML = html;
  Object.assign(holder.style, { position: "fixed", left: "-9999px", top: "0", opacity: "0" });
  document.body.appendChild(holder);
  const range = document.createRange();
  range.selectNodeContents(holder);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  const ok = document.execCommand("copy");
  sel?.removeAllRanges();
  holder.remove();
  return ok;
}

function useCopied(onDone?: () => void) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const run = async (fn: () => Promise<boolean>) => {
    const ok = await fn().catch(() => false);
    setState(ok ? "done" : "failed");
    if (ok) onDone?.();
    window.setTimeout(() => setState("idle"), 2200);
  };
  return [state, run] as const;
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function CopyPictureButton({ src, primary = true, onCopied }: { src: string; primary?: boolean; onCopied?: () => void }) {
  const [state, run] = useCopied(onCopied);
  const html = `<img src="${escape(src)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;">`;
  return (
    <button
      type="button"
      className={`btn ${state === "done" ? "done" : primary ? "btn-primary" : ""}`}
      onClick={() => run(() => copyRich(html, " "))}
    >
      {state === "done" ? "Copied. Now paste it in Gmail" : state === "failed" ? "Couldn't copy. Try again" : "Copy tracking picture"}
    </button>
  );
}

/** A box you can paste into, to confirm the tracking picture really is on your clipboard. */
export function PasteCheck({ onOk }: { onOk?: () => void } = {}) {
  const [result, setResult] = useState<"idle" | "ok" | "wrong">("idle");
  return (
    <div
      className={`paste-check ${result}`}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="Paste here to check"
      tabIndex={0}
      onPaste={(e) => {
        e.preventDefault();
        const html = e.clipboardData.getData("text/html");
        const ok = /\/o\/[0-9A-Za-z]{22}\.gif/.test(html);
        setResult(ok ? "ok" : "wrong");
        if (ok) onOk?.();
      }}
      onKeyDown={(e) => {
        if (!(e.metaKey || e.ctrlKey)) e.preventDefault();
      }}
    >
      {result === "ok"
        ? "The tracking picture is copied. Paste it into Gmail the same way."
        : result === "wrong"
          ? "That isn't the tracking picture. Click “Copy tracking picture” first, then paste again."
          : "Not sure it copied? Click in this box and paste (⌘V or Ctrl+V) to check."}
    </div>
  );
}

export function CopyLinkButton({ trackedUrl, originalUrl }: { trackedUrl: string; originalUrl: string }) {
  const [state, run] = useCopied();
  const shown = originalUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const html = `<a href="${escape(trackedUrl)}">${escape(shown)}</a>`;
  return (
    <button
      type="button"
      className={`btn btn-sm ${state === "done" ? "done" : ""}`}
      aria-label={state === "done" ? `Copied link to ${shown}` : `Copy link to ${shown}`}
      onClick={() => run(() => copyRich(html, trackedUrl))}
    >
      {state === "done" ? "Copied" : "Copy link"}
    </button>
  );
}

export function CopyTextButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, run] = useCopied();
  return (
    <button
      type="button"
      className={`btn btn-sm ${state === "done" ? "done" : ""}`}
      onClick={() =>
        run(async () => {
          await navigator.clipboard.writeText(text);
          return true;
        })
      }
    >
      {state === "done" ? "Copied" : label}
    </button>
  );
}
