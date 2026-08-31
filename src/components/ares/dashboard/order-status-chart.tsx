"use client";

const STATUS_COLORS: Record<string, string> = {
  FULFILLED: "#0EA5C7",
  CONFIRMED: "#0369A1",
  PENDING: "#F59E0B",
  CANCELLED: "#94A3B8",
  REFUNDED: "#EF4444",
};

const STATUS_LABELS: Record<string, string> = {
  FULFILLED: "Fulfilled",
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function AresOrderStatusChart({ data }: { data: any }) {
  const statuses: { name: string; value: number }[] = data.statusBreakdown;
  const total = statuses.reduce((s, c) => s + c.value, 0) || 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-ares-line bg-white">
      <div className="border-b border-ares-line p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Orders
        </div>
        <div className="mt-1 text-sm font-semibold text-ares-navy">Status distribution</div>
      </div>
      <div className="p-5">
        {/* Stacked horizontal bar */}
        <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full bg-ares-mist">
          {statuses.map((s, i) => (
            <div
              key={i}
              style={{
                width: `${(s.value / total) * 100}%`,
                background: STATUS_COLORS[s.name] ?? "#0EA5C7",
              }}
              className="h-full"
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {statuses.map((s) => (
            <div key={s.name} className="flex items-center justify-between rounded-lg border border-ares-line px-3 py-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: STATUS_COLORS[s.name] ?? "#0EA5C7" }}
                />
                <span className="text-xs font-medium text-ares-navy">
                  {STATUS_LABELS[s.name] ?? s.name}
                </span>
              </div>
              <span className="font-mono text-xs font-semibold text-ares-navy">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
