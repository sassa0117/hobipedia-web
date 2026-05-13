import Link from "next/link";

export function BackBar({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <div className="bg-sky-100 px-3 py-2 text-[13px] sm:px-5">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <Link href={href} className="text-sky-600 hover:underline">
          ← 戻る
        </Link>
        <span className="font-semibold text-sky-700">{label}</span>
      </div>
    </div>
  );
}
