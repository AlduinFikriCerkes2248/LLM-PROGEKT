"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-slate-800/70 border border-white/5",
        className
      )}
    />
  );
}

export function SkeletonLeagueGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-[rgba(65,140,190,0.2)] bg-[#101a29]/75 p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-16 rounded-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="flex justify-between pt-3 border-t border-white/5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
