"use client";

const CHANNEL_COLORS: Record<string, string> = {
  WHATSAPP: "#0EA5C7",
  WEB: "#0369A1",
  INSTORE: "#7DD3FC",
  CALL: "#0B1F33",
  SMS: "#38BDF8",
  EMAIL: "#1A5694",
};

export function AresChannelsChart({ data }: { data: any }) {
  const channels: { name: string; value: number }[] = data.channelBreakdown;
  const total = channels.reduce((s, c) => s + c.value, 0) || 1;

  // Donut math
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const segments = channels.map((c, i) => {
    const pct = c.value / total;
    const dash = pct * circumference;
    const offset = channels.slice(0, i).reduce((s, x) => s + (x.value / total) * circumference, 0);
    return { ...c, dash, offset, color: CHANNEL_COLORS[c.name] ?? "#0EA5C7" };
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-ares-line bg-white">
      <div className="border-b border-ares-line p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Channels
        </div>
        <div className="mt-1 text-sm font-semibold text-ares-navy">Orders by source</div>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-5">
          {/* Donut */}
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
              {segments.map((s, i) => (
                <circle
                  key={i}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="14"
                  strokeDasharray={`${s.dash} ${circumference - s.dash}`}
                  strokeDashoffset={-s.offset}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-mono text-2xl font-bold text-ares-navy">{total}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">orders</div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex-1 space-y-2">
            {channels.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: CHANNEL_COLORS[c.name] ?? "#0EA5C7" }}
                  />
                  <span className="font-medium text-ares-navy">{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {Math.round((c.value / total) * 100)}%
                  </span>
                  <span className="font-mono font-semibold text-ares-navy">{c.value}</span>
                </div>
              </div>
            ))}
            {channels.length === 0 && (
              <div className="text-xs text-muted-foreground">No channel data yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
