import type { ReactNode } from "react";

/*
 * A small, safe markdown renderer: headings, bold, italic, code, links, lists and quotes.
 * It builds real elements and never injects HTML, so a note can't run anything.
 */

const INLINE = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>()]+)/g;

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${n++}`;
    if (m[1] !== undefined) out.push(<strong key={k}>{m[1]}</strong>);
    else if (m[2] !== undefined || m[3] !== undefined) out.push(<em key={k}>{m[2] ?? m[3]}</em>);
    else if (m[4] !== undefined) out.push(<code key={k}>{m[4]}</code>);
    else {
      const href = m[6] ?? m[7]!.replace(/[.,;:!?]+$/, "");
      out.push(
        <a key={k} href={href} target="_blank" rel="noopener noreferrer">
          {m[5] ?? href.replace(/^https?:\/\//, "")}
        </a>,
      );
      if (m[7] && m[7] !== href) out.push(m[7].slice(href.length));
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `b${i}`;
    if (!line.trim()) { i++; continue; }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const Tag = (["h3", "h4", "h5"] as const)[heading[1].length - 1];
      blocks.push(<Tag key={key}>{inline(heading[2], key)}</Tag>);
      i++;
      continue;
    }

    const bullet = /^\s*[-*]\s+/;
    const numbered = /^\s*\d+\.\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const mark = bullet.test(line) ? bullet : numbered;
      const items: ReactNode[] = [];
      while (i < lines.length && mark.test(lines[i])) {
        items.push(<li key={`l${i}`}>{inline(lines[i].replace(mark, ""), `l${i}`)}</li>);
        i++;
      }
      blocks.push(mark === bullet ? <ul key={key}>{items}</ul> : <ol key={key}>{items}</ol>);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(<blockquote key={key}>{inline(quote.join(" "), key)}</blockquote>);
      continue;
    }

    const para: ReactNode[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|\s*[-*]\s|\s*\d+\.\s|>)/.test(lines[i])) {
      if (para.length) para.push(<br key={`br${i}`} />);
      para.push(...inline(lines[i], `p${i}`));
      i++;
    }
    blocks.push(<p key={key}>{para}</p>);
  }
  return <div className={`md ${className}`.trim()}>{blocks}</div>;
}
