"use client";

import { useState } from "react";
import { Search, Check, Package, MapPin, Clock, Phone, User, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function AresOrderLookup({ data }: { data: any }) {
  const [code, setCode] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const symbol = data?.business?.currency === "GHS" ? "GH₵" : data?.business?.currency ?? "";

  async function search() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      // Search by order code in the notes field
      const res = await fetch(`/api/orders?search=${encodeURIComponent(code.trim().toUpperCase())}`);
      const json = await res.json();
      const found = (json.orders ?? []).find((o: any) => {
        const notes = o.notes ?? "";
        return notes.toUpperCase().includes(code.trim().toUpperCase());
      });
      if (found) {
        setOrder(found);
      } else {
        setError(`No order found with code "${code.trim().toUpperCase()}"`);
      }
    } catch {
      setError("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function markPaid() {
    if (!order) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Order marked as paid", description: `Order ${code.trim().toUpperCase()} is now confirmed.` });
      setOrder({ ...order, status: "CONFIRMED" });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ares-navy">Order Lookup</h2>
        <p className="text-xs text-muted-foreground">Enter an order code to find and manage the order</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex flex-1 items-center rounded-xl border border-ares-line bg-white px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            placeholder="Enter 4-character code (e.g. K7P3)"
            className="flex-1 bg-transparent px-2 py-2.5 text-sm text-ares-navy placeholder:text-muted-foreground focus:outline-none"
            maxLength={10}
          />
        </div>
        <button
          onClick={search}
          disabled={loading || !code.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-ares-sea-deep disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Find
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Order details */}
      {order && (
        <div className="rounded-2xl border border-ares-line bg-white p-5">
          {/* Order header */}
          <div className="flex items-center justify-between border-b border-ares-line pb-3">
            <div>
              <div className="text-sm font-bold text-ares-navy">Order {code.trim().toUpperCase()}</div>
              <div className="text-[11px] text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${
              order.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" :
              order.status === "FULFILLED" ? "bg-ares-foam text-ares-sea-deep" :
              order.status === "CANCELLED" ? "bg-rose-100 text-rose-700" :
              "bg-amber-100 text-amber-700"
            }`}>
              {order.status === "CONFIRMED" ? "PAID" : order.status === "FULFILLED" ? "CLOSED" : order.status === "CANCELLED" ? "CANCELLED" : "PENDING PAYMENT"}
            </span>
          </div>

          {/* Customer info */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <InfoRow icon={User} label="Customer" value={order.customerName ?? "—"} />
            <InfoRow icon={Phone} label="Phone" value={order.customerPhone ?? "—"} />
            <InfoRow icon={CreditCard} label="Fulfillment" value={order.fulfillmentType ?? "—"} />
            <InfoRow icon={MapPin} label="Location" value={order.deliveryLocation ?? "—"} />
            <InfoRow icon={Clock} label="Time" value={order.deliveryTime ?? "—"} />
          </div>

          {/* Items */}
          <div className="mt-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Items</div>
            <div className="mt-2 space-y-2">
              {(order.items ?? []).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-ares-line p-2.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ares-mist">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-ares-navy">{item.name}</div>
                    <div className="text-[11px] text-muted-foreground">Qty: {item.quantity} × {symbol}{item.unitPrice.toFixed(2)}</div>
                  </div>
                  <div className="font-mono text-sm font-bold text-ares-navy">{symbol}{item.total.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="mt-4 flex items-center justify-between border-t border-ares-line pt-3">
            <span className="text-sm font-semibold text-ares-navy">Total</span>
            <span className="font-mono text-xl font-bold text-ares-sea-deep">{symbol}{order.total.toFixed(2)}</span>
          </div>

          {/* Mark as paid button */}
          {order.status === "PENDING" && (
            <button
              onClick={markPaid}
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Mark as Paid
            </button>
          )}
          {order.status === "CONFIRMED" && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <Check className="h-4 w-4" />
              Payment confirmed
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-ares-mist p-2.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-ares-sea-deep" />
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-xs font-medium text-ares-navy">{value}</div>
      </div>
    </div>
  );
}
