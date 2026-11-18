import { STATUS_LABEL, STATUS_TAG } from "@/lib/format";
import type { Status } from "@/lib/track";

export function StatusTag({ status }: { status: Status }) {
  return <span className={`tag ${STATUS_TAG[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function Avatar({ name, admin = false }: { name: string; admin?: boolean }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?";
  return (
    <span className={`avatar ${admin ? "avatar-admin" : ""}`} aria-hidden="true">
      {initials}
    </span>
  );
}

export function Notice({ kind, children }: { kind: "ok" | "error" | "info"; children: React.ReactNode }) {
  return (
    <div className={`notice notice-${kind}`} role={kind === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}
