"use client";

export function DemoNoticeBadge() {
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (!isDemo) return null;

  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-1 text-[11px] font-bold text-emerald-300 shadow-sm">
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      <span>Віртуальні монети, без реальних грошей</span>
    </div>
  );
}
