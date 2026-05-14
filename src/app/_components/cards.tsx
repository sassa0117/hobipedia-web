import type { ReactNode } from "react";

export function SectionCard({
  title,
  children,
  noPad,
  noHeader,
}: {
  title?: string;
  children: ReactNode;
  noPad?: boolean;
  noHeader?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      {!noHeader && title && (
        <header className="border-l-[3px] border-sky-300 border-b border-zinc-100 px-4 py-2.5">
          <h2 className="text-[13px] font-bold text-zinc-700">{title}</h2>
        </header>
      )}
      <div className={noPad ? "" : "p-4"}>{children}</div>
    </section>
  );
}

export function PriceCell({
  label,
  value,
  cls,
  suffix,
}: {
  label: string;
  value: string;
  cls: string;
  suffix?: string;
}) {
  return (
    <div>
      <p className="text-[10px] text-zinc-400">{label}</p>
      <p className={`mt-0.5 text-base font-bold tabular-nums ${cls}`}>
        {value}
        {suffix && (
          <span className="ml-0.5 text-[11px] font-normal text-amber-500">
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}

export function BrandButton({
  href,
  label,
  bg,
  ec,
  rank,
  section = "brand-buttons",
}: {
  href: string;
  label: string;
  bg: string;
  ec?: string;
  rank?: number;
  section?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-ec={ec}
      data-rank={rank}
      data-section={section}
      className="flex items-center justify-between rounded-lg px-4 py-2.5 text-[13px] font-bold text-white"
      style={{ background: bg }}
    >
      <span>{label}</span>
      <span className="text-xs opacity-80">↗</span>
    </a>
  );
}

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-2 border-b border-zinc-100 py-1 last:border-0">
      <dt className="shrink-0 text-zinc-400">{label}</dt>
      <dd className="text-right text-zinc-700">{value}</dd>
    </div>
  );
}
