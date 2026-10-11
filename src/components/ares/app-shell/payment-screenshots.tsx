"use client";

import { useState, useEffect } from "react";
import { Image as ImageIcon, Check, X, Loader2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Screenshot {
  id: string;
  orderCode: string | null;
  orderId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  vlmVerified: boolean;
  verified: boolean;
  amount: number | null;
  status: string;
  vlmAnalysis: string | null;
  createdAt: string;
  hasImage: boolean;
}

export function AresPaymentScreenshots() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    loadScreenshots();
  }, []);

  async function loadScreenshots() {
    setLoading(true);
    try {
      const res = await fetch("/api/payment-screenshots");
      const data = await res.json();
      setScreenshots(data.screenshots ?? []);
    } catch (e) {
      console.error("Failed to load screenshots:", e);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, action: "verify" | "reject") {
    try {
      const res = await fetch("/api/payment-screenshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshotId: id, action }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: action === "verify" ? "Payment verified" : "Payment rejected",
          description: action === "verify" ? "Order marked as paid." : "Screenshot marked as rejected.",
        });
        loadScreenshots();
      }
    } catch (e) {
      toast({ title: "Failed", description: "Please try again.", variant: "destructive" });
    }
  }

  const filtered = filter === "ALL" ? screenshots : screenshots.filter((s) => s.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-ares-sea-deep" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ares-navy">Payment Screenshots</h2>
          <p className="text-xs text-muted-foreground">{screenshots.length} screenshot{screenshots.length === 1 ? "" : "s"} uploaded by customers</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["ALL", "PENDING", "VERIFIED", "REJECTED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === f ? "bg-ares-navy text-white" : "border border-ares-line bg-white text-ares-navy hover:border-ares-sea/40"}`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ares-line bg-white p-10 text-center">
          <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold text-ares-navy">No screenshots yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            When customers upload payment screenshots, they'll appear here for your review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-2xl border border-ares-line bg-white">
              {/* Screenshot thumbnail */}
              <div
                className="relative aspect-video cursor-pointer bg-ares-mist"
                onClick={() => setViewingId(s.id)}
              >
                {s.hasImage ? (
                  <img
                    src={`/api/payment-screenshots/${s.id}`}
                    alt="Payment screenshot"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
                {/* Status badge */}
                <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  s.status === "VERIFIED" ? "bg-emerald-500 text-white" :
                  s.status === "REJECTED" ? "bg-rose-500 text-white" :
                  "bg-amber-500 text-white"
                }`}>
                  {s.status}
                </span>
                {/* VLM badge */}
                {s.vlmVerified && (
                  <span className="absolute left-2 top-2 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                    AI ✓
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    {s.orderCode && (
                      <div className="text-sm font-bold text-ares-navy">Code: {s.orderCode}</div>
                    )}
                    {s.amount != null && (
                      <div className="text-xs text-muted-foreground">Amount: GHS {s.amount.toFixed(2)}</div>
                    )}
                    {s.customerName && (
                      <div className="text-xs text-muted-foreground">{s.customerName}</div>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                {/* Actions */}
                {s.status === "PENDING" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => updateStatus(s.id, "verify")}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                    >
                      <Check className="h-3 w-3" /> Verify
                    </button>
                    <button
                      onClick={() => updateStatus(s.id, "reject")}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600"
                    >
                      <X className="h-3 w-3" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-screen screenshot viewer */}
      {viewingId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setViewingId(null)}
        >
          <button
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setViewingId(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="max-h-[90vh] max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={`/api/payment-screenshots/${viewingId}`}
              alt="Payment screenshot"
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
            {(() => {
              const s = screenshots.find((x) => x.id === viewingId);
              if (!s) return null;
              return (
                <div className="mt-3 text-center text-white">
                  <div className="text-sm font-semibold">
                    {s.orderCode ? `Order code: ${s.orderCode}` : "No order code"}
                  </div>
                  {s.amount != null && <div className="text-xs text-white/70">Amount: GHS {s.amount.toFixed(2)}</div>}
                  {s.vlmAnalysis && (
                    <div className="mt-2 rounded-lg bg-white/10 p-3 text-left text-[10px] text-white/80">
                      <div className="font-semibold mb-1">AI Analysis:</div>
                      <pre className="whitespace-pre-wrap">{s.vlmAnalysis.slice(0, 300)}</pre>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
