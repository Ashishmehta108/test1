import { normaliseUrl } from "./format";

/*
 * A tracked email keeps everything the sender wants to remember in one markdown note.
 * Two things are read out of it: the first line (shown as the subject in the results list)
 * and any links (each gets a tracked version).
 */

const COMMON_ENDINGS = "com|in|co|io|org|net|app|dev|ai|me|info|biz|uk|us|ca|au|de|fr|sg|ae";
const LINK = new RegExp(
  // [text](address)  |  https://...  |  www....  |  plain "site.com/page"
  `\\[[^\\]]*\\]\\(([^)\\s]+)\\)|(https?:\\/\\/[^\\s<>()\\]]+)|(?<![@\\w./-])((?:www\\.)?[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:${COMMON_ENDINGS})(?![a-z0-9-])(?:\\/[^\\s<>()\\]]*)?)`,
  "gi",
);

export const MAX_NOTES = 10_000;
export const MAX_LINKS = 20;

/** The first line with its markdown marks removed: "# Q4 offer" becomes "Q4 offer". */
export function subjectOf(notes: string): string {
  const first = notes.split(/\r?\n/).find((l) => l.trim()) ?? "";
  return first
    .replace(/^\s*(#{1,6}|[-*>]|\d+\.)\s+/, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim()
    .slice(0, 120);
}

/** Every web link written in the note, cleaned up, without repeats, in the order written. */
export function linksIn(notes: string): string[] {
  const found: string[] = [];
  for (const m of notes.matchAll(LINK)) {
    const raw = (m[1] ?? m[2] ?? m[3] ?? "").replace(/[.,;:!?'"]+$/, "");
    const url = normaliseUrl(raw);
    if (url && !found.includes(url)) found.push(url);
    if (found.length >= MAX_LINKS) break;
  }
  return found;
}
