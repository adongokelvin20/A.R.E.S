"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Loader2, ShoppingBag, Truck, Store, MapPin, Clock, Phone, Download, CheckCircle2, XCircle, Eye, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Order {
  id: string;
  customerName?: string | null;
  customerPhone?: string | null;
  status: string;
  channel: string;
  total: number;
  currency: string;
  fulfillmentType: string;
  deliveryLocation?: string | null;
  deliveryTime?: string | null;
  deliveryPhone?: string | null;
  notes?: string | null;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-sky-100 text-sky-700",
  FULFILLED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  FULFILLED: "Closed",
  CANCELLED: "Cancelled",
};

export function AresOrders({ data, onChanged }: { data: any; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [list, setList] = useState<Order[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const json = await res.json();
      setList(json.orders ?? []);
    } catch (e) {
      console.error("Failed to load orders", e);
      setList([]);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      const labels: Record<string, string> = { CONFIRMED: "confirmed", FULFILLED: "closed", CANCELLED: "cancelled" };
      toast({ title: `Order ${labels[status] ?? status.toLowerCase()}`, description: `Order #${id.slice(-6).toUpperCase()} has been ${labels[status] ?? status.toLowerCase()}.` });
      await loadOrders();
      onChanged();
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  }

  function exportCSV() {
    if (!list || list.length === 0) {
      toast({ title: "No orders to export", description: "Add some orders first." });
      return;
    }
    const rows = [
      ["Order ID", "Customer", "Phone", "Status", "Channel", "Fulfillment", "Total", "Currency", "Items", "Delivery Location", "Delivery Time", "Delivery Phone", "Created At"],
      ...list.map((o) => [
        o.id,
        o.customerName || "",
        o.customerPhone || "",
        o.status,
        o.channel,
        o.fulfillmentType,
        o.total.toFixed(2),
        o.currency,
        o.items.map((i) => `${i.quantity}× ${i.name}`).join("; "),
        o.deliveryLocation || "",
        o.deliveryTime || "",
        o.deliveryPhone || "",
        new Date(o.createdAt).toISOString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ares-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${list.length} orders exported to CSV.` });
  }

  const filtered = list?.filter((o) => filter === "ALL" ? true : o.status === filter) ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ares-navy">Orders</h2>
          <p className="text-xs text-muted-foreground">
            {list?.length ?? 0} order{(list?.length ?? 0) === 1 ? "" : "s"} total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ares-line bg-white px-4 py-2.5 text-sm font-semibold text-ares-navy transition-colors hover:border-ares-sea/40"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ares-sea-deep"
          >
            <Plus className="h-4 w-4" />
            New order
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      {list && list.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {["ALL", "PENDING", "CONFIRMED", "FULFILLED", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === s
                  ? "bg-ares-navy text-white"
                  : "bg-white border border-ares-line text-muted-foreground hover:border-ares-sea/40"
              }`}
            >
              {s === "ALL" ? "All" : STATUS_LABELS[s] ?? s}
              <span className="ml-1.5 opacity-60">
                {s === "ALL" ? list.length : list.filter((o) => o.status === s).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {list && list.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ares-line bg-white p-10 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold text-ares-navy">No orders yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Orders will appear here when customers place them via WhatsApp or web. You can also create one manually.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-4 py-2 text-xs font-semibold text-white hover:bg-ares-sea-deep"
          >
            <Plus className="h-3.5 w-3.5" />
            Create your first order
          </button>
        </div>
      )}

      {/* Orders list */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((o) => {
            const expanded = expandedId === o.id;
            return (
              <div key={o.id} className="rounded-2xl border border-ares-line bg-white overflow-hidden">
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(-6).toUpperCase()}</span>
                        <span className="font-semibold text-sm text-ares-navy">
                          {o.customerName || "Walk-in customer"}
                        </span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[o.status] ?? "bg-slate-100 text-slate-500"}`}>
                          {STATUS_LABELS[o.status] ?? o.status}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-ares-mist px-1.5 py-0.5 text-[10px] font-medium text-ares-navy">
                          {o.fulfillmentType === "DELIVERY" ? <><Truck className="h-3 w-3" /> Delivery</> : <><Store className="h-3 w-3" /> Pickup</>}
                        </span>
                        <span className="rounded-md bg-ares-foam px-1.5 py-0.5 text-[10px] font-medium text-ares-sea-deep">
                          {o.channel}
                        </span>
                      </div>
                      {o.customerPhone && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{o.customerPhone}</div>
                      )}
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(o.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-base font-bold text-ares-sea-deep">
                        {o.currency === "GHS" ? "GH₵" : o.currency} {o.total.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="mt-3 flex items-center justify-between border-t border-ares-line pt-3">
                    <div className="text-xs text-muted-foreground">
                      {o.items.length} item{o.items.length === 1 ? "" : "s"}: {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                    </div>
                    <button
                      onClick={() => setExpandedId(expanded ? null : o.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-ares-sea-deep hover:bg-ares-foam"
                    >
                      <Eye className="h-3 w-3" />
                      {expanded ? "Hide" : "Review"}
                      <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {/* Expanded details + actions */}
                  {expanded && (
                    <div className="mt-3 space-y-3 border-t border-ares-line pt-3">
                      {/* Items */}
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Items</div>
                        <div className="mt-1.5 space-y-1">
                          {o.items.map((it) => (
                            <div key={it.id} className="flex items-center justify-between text-xs">
                              <span className="text-ares-navy">{it.quantity}× {it.name}</span>
                              <span className="font-mono text-muted-foreground">{o.currency === "GHS" ? "GH₵" : o.currency} {it.total.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery details */}
                      {o.fulfillmentType === "DELIVERY" && (
                        <div className="grid grid-cols-1 gap-2 rounded-lg bg-ares-mist p-3 text-xs sm:grid-cols-3">
                          {o.deliveryLocation && (
                            <div className="flex items-center gap-1.5 text-ares-navy">
                              <MapPin className="h-3 w-3 text-ares-sea-deep" />
                              <span className="text-muted-foreground">Location:</span> {o.deliveryLocation}
                            </div>
                          )}
                          {o.deliveryTime && (
                            <div className="flex items-center gap-1.5 text-ares-navy">
                              <Clock className="h-3 w-3 text-ares-sea-deep" />
                              <span className="text-muted-foreground">Time:</span> {o.deliveryTime}
                            </div>
                          )}
                          {o.deliveryPhone && (
                            <div className="flex items-center gap-1.5 text-ares-navy">
                              <Phone className="h-3 w-3 text-ares-sea-deep" />
                              <span className="text-muted-foreground">Phone:</span> {o.deliveryPhone}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {o.notes && (
                        <div className="rounded-lg border border-ares-line p-2.5 text-xs text-muted-foreground">
                          <span className="font-medium text-ares-navy">Note:</span> {o.notes}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {o.status === "PENDING" && (
                          <button
                            onClick={() => updateStatus(o.id, "CONFIRMED")}
                            disabled={updatingId === o.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                          >
                            {updatingId === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            Confirm order
                          </button>
                        )}
                        {(o.status === "PENDING" || o.status === "CONFIRMED") && (
                          <button
                            onClick={() => updateStatus(o.id, "FULFILLED")}
                            disabled={updatingId === o.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {updatingId === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            Mark as closed
                          </button>
                        )}
                        {o.status !== "CANCELLED" && o.status !== "FULFILLED" && (
                          <button
                            onClick={() => updateStatus(o.id, "CANCELLED")}
                            disabled={updatingId === o.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            {updatingId === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <OrderForm
          products={data.products ?? []}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadOrders();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function OrderForm({ products, onClose, onSaved }: { products: any[]; onClose: () => void; onSaved: () => void }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState<{ name: string; quantity: number; unitPrice: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addItem() {
    if (!selectedProductId) return;
    const p = products.find((x) => x.id === selectedProductId);
    if (!p) return;
    setItems((prev) => [...prev, { name: p.name, quantity: 1, unitPrice: p.price }]);
    setSelectedProductId("");
  }

  function updateItem(i: number, patch: Partial<{ name: string; quantity: number; unitPrice: number }>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  const total = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (items.length === 0) {
      setError("Add at least one item.");
      return;
    }
    if (fulfillmentType === "DELIVERY") {
      if (!deliveryLocation.trim() || !deliveryPhone.trim()) {
        setError("Delivery orders need a location and phone number.");
        return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          items,
          fulfillmentType,
          deliveryLocation,
          deliveryTime,
          deliveryPhone,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed");
      toast({ title: "Order created", description: `Order for ${customerName || "customer"} has been created.` });
      onSaved();
    } catch (e: any) {
      setError(e?.message ?? "Failed");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ares-navy/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto ares-scroll rounded-3xl border border-ares-line bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-ares-line bg-white px-6 py-4">
          <h3 className="text-sm font-semibold text-ares-navy">New order</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-ares-mist">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ares-navy">Customer name</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Akosua M."
                className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ares-navy">Phone</label>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+233..."
                className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ares-navy">Fulfillment</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFulfillmentType("PICKUP")}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-all ${
                  fulfillmentType === "PICKUP" ? "border-ares-sea bg-ares-foam/50" : "border-ares-line hover:border-ares-sea/40"
                }`}
              >
                <Store className="h-4 w-4 text-ares-sea-deep" />
                <div>
                  <div className="text-sm font-semibold text-ares-navy">Pickup</div>
                  <div className="text-[11px] text-muted-foreground">Customer picks up</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFulfillmentType("DELIVERY")}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-all ${
                  fulfillmentType === "DELIVERY" ? "border-ares-sea bg-ares-foam/50" : "border-ares-line hover:border-ares-sea/40"
                }`}
              >
                <Truck className="h-4 w-4 text-ares-sea-deep" />
                <div>
                  <div className="text-sm font-semibold text-ares-navy">Delivery</div>
                  <div className="text-[11px] text-muted-foreground">You deliver to them</div>
                </div>
              </button>
            </div>
          </div>

          {fulfillmentType === "DELIVERY" && (
            <div className="space-y-3 rounded-xl border border-ares-sea/20 bg-ares-foam/30 p-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ares-navy">Delivery location *</label>
                <input
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  placeholder="Landmark, street, area"
                  className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ares-navy">Preferred time</label>
                  <input
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    placeholder="e.g. Today 6pm"
                    className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ares-navy">Phone *</label>
                  <input
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    placeholder="+233..."
                    className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ares-navy">Items</label>
            <div className="flex gap-2">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="flex-1 rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none"
              >
                <option value="">Pick a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} -- GH₵ {p.price.toFixed(2)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addItem}
                disabled={!selectedProductId}
                className="rounded-lg bg-ares-sea-deep px-3 py-2 text-sm font-semibold text-white hover:bg-ares-navy disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {items.length > 0 && (
              <div className="mt-2 space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-ares-line bg-ares-mist p-2">
                    <input
                      value={it.name}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                      className="flex-1 bg-transparent text-xs text-ares-navy focus:outline-none"
                    />
                    <input
                      type="number"
                      value={it.quantity}
                      onChange={(e) => updateItem(i, { quantity: Math.max(1, parseInt(e.target.value || "1", 10)) })}
                      className="w-14 rounded border border-ares-line bg-white px-1.5 py-0.5 text-xs text-ares-navy focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={it.unitPrice}
                      onChange={(e) => updateItem(i, { unitPrice: parseFloat(e.target.value || "0") })}
                      className="w-20 rounded border border-ares-line bg-white px-1.5 py-0.5 text-xs text-ares-navy focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="rounded p-1 text-rose-600 hover:bg-rose-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-ares-line pt-2 text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-mono font-bold text-ares-sea-deep">GH₵ {total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ares-navy">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any special instructions"
              className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-ares-line bg-white px-4 py-2 text-sm font-medium text-ares-navy hover:border-ares-sea/40">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ares-navy px-4 py-2 text-sm font-semibold text-white hover:bg-ares-sea-deep disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating…" : "Create order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
