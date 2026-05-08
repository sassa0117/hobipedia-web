"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  id: string;
  name: string;
  imageUrl: string | null;
  releaseDate: string | null;
  mercariMedian: number | null;
  trendDirection: number | null;
};

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return `¥${n.toLocaleString()}`;
}

export function ItemCard({
  id,
  name,
  imageUrl,
  releaseDate,
  mercariMedian,
  trendDirection,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = imageUrl && !imgFailed;
  const td = trendDirection;

  return (
    <Link
      href={`/catalog/${id}`}
      className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-sky-300"
    >
      <div className="aspect-square w-full overflow-hidden bg-zinc-50">
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-300">
            no image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-[13px] leading-snug text-zinc-700">
          {name}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <span className="text-[15px] font-bold text-zinc-800">
            {fmt(mercariMedian)}
          </span>
          {td != null && (
            <span
              className={`text-[12px] font-bold ${
                td > 0
                  ? "text-emerald-600"
                  : td < 0
                  ? "text-rose-500"
                  : "text-zinc-400"
              }`}
            >
              {td > 0 ? "+" : ""}
              {Math.round(td)}%
            </span>
          )}
        </div>
        {releaseDate && (
          <p className="text-[10px] text-zinc-400">{releaseDate}</p>
        )}
      </div>
    </Link>
  );
}
