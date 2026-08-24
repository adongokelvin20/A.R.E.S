"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Loader2, Play, Pause, Trash2, Zap, Workflow } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Automation {
  id: string;
  name: string;
  description?: string | null;
  trigger: string;
  actions: string[];
  condition: any;
  status: string;
  runCount: number;
  createdAt: string;
}

const TRIGGER_OPTIONS = [
  { value: "NEW_ORDER", label: "When a new order is created" },
  { value: "LOW_INVENTORY", label: "When inventory drops below threshold" },
  { value: "CUSTOMER_WAIT", label: "When a customer waits too long for a reply" },
  { value: "PAYMENT_RECEIVED", label: "When a payment is received" },
  { value: "PAYMENT_FAILED", label: "When a payment fails" },
  { value: "NEW_CUSTOMER", label: "When a new customer signs up" },
  { value: "ORDER_CANCELLED", label: "When an order is cancelled" },
  { value: "DAILY_SUMMARY", label: "Daily summary (every morning)" },
];

const ACTION_OPTIONS = [
  { value: "notify_owner", label: "Notify the owner" },
  { value: "send_whatsapp_message", label: "Send a WhatsApp message" },
  { value: "send_email", label: "Send an email" },
  { value: "create_restock_task", label: "Create a restock task" },
  { value: "update_inventory", label: "Update inventory" },
  { value: "auto_acknowledge", label: "Auto-acknowledge the customer" },
  { value: "create_followup_task", label: "Create a follow-up task" },
  { value: "send_receipt", label: "Send a receipt" },
  { value: "alert_owner", label: "Alert the owner (urgent)" },
];

export function AresAutomations({ data }: { data: any }) {
  const [list, setList] = useState<Automation[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/automations");
      const json = await res.json();
      setList(json.automations ?? []);
    } catch (e) {
      console.error("Failed to load automations", e);
      setList([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(a: Automation) {
    setUpdatingId(a.id);
    try {
      await fetch(`/api/automations/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: a.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }),
      });
      toast({ title: a.status === "ACTIVE" ? "Automation paused" : "Automation activated", description: `${a.name} is now ${a.status === "ACTIVE" ? "paused" : "active"}.` });
      await load();
    } finally {
      setUpdatingId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this automation? This cannot be undone.")) return;
    setUpdatingId(id);
    try {
      await fetch(`/api/automations/${id}`, { method: "DELETE" });
      toast({ title: "Automation deleted", description: "The automation has been removed." });
      await load();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ares-navy">Automations</h2>
          <p className="text-xs text-muted-foreground">
            Personalize how your assistant acts. Automations stick until you delete them.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ares-sea-deep"
        >
          <Plus className="h-4 w-4" />
          Add automation
        </button>
      </div>

      {list && list.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ares-line bg-white p-10 text-center">
          <Workflow className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold text-ares-navy">No automations yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Create automations to control how your assistant responds to events -- like notifying you when stock is low, or auto-acknowledging customers who wait too long.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-ares-navy px-4 py-2 text-xs font-semibold text-white hover:bg-ares-sea-deep"
          >
            <Plus className="h-3.5 w-3.5" />
            Create your first automation
          </button>
        </div>
      )}

      {list && list.length > 0 && (
        <div className="space-y-3">
          {list.map((a) => {
            const isActive = a.status === "ACTIVE";
            return (
              <div key={a.id} className="rounded-2xl border border-ares-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Zap className={`h-4 w-4 ${isActive ? "text-ares-sea-deep" : "text-muted-foreground"}`} />
                      <span className="text-sm font-semibold text-ares-navy">{a.name}</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                        isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {isActive ? "Active" : "Paused"}
                      </span>
                    </div>
                    {a.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-ares-mist px-1.5 py-0.5 text-[10px] font-medium text-ares-navy">
                        WHEN · {TRIGGER_OPTIONS.find((t) => t.value === a.trigger)?.label ?? a.trigger.replace(/_/g, " ").toLowerCase()}
                      </span>
                      {a.actions.map((act) => (
                        <span key={act} className="rounded bg-ares-foam px-1.5 py-0.5 text-[10px] font-medium text-ares-sea-deep">
                          THEN · {ACTION_OPTIONS.find((x) => x.value === act)?.label ?? act.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      Ran {a.runCount} times · created {new Date(a.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => toggle(a)}
                      disabled={updatingId === a.id}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isActive ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                      } hover:opacity-80 disabled:opacity-50`}
                      aria-label={isActive ? "Pause" : "Activate"}
                    >
                      {updatingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => remove(a.id)}
                      disabled={updatingId === a.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <AutomationForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AutomationForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("NEW_ORDER");
  const [selectedActions, setSelectedActions] = useState<string[]>(["notify_owner"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAction(a: string) {
    setSelectedActions((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Give your automation a name.");
      return;
    }
    if (selectedActions.length === 0) {
      setError("Pick at least one action.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, trigger, actions: selectedActions }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed");
      toast({ title: "Automation created", description: `${name} is now active.` });
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
          <h3 className="text-sm font-semibold text-ares-navy">New automation</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-ares-mist">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-ares-navy">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Low stock alert"
              className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ares-navy">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What should this automation do?"
              className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ares-navy">When (trigger)</label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="w-full rounded-lg border border-ares-line bg-white px-3 py-2 text-sm text-ares-navy focus:border-ares-sea/40 focus:outline-none"
            >
              {TRIGGER_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ares-navy">Then (actions)</label>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {ACTION_OPTIONS.map((a) => {
                const selected = selectedActions.includes(a.value);
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => toggleAction(a.value)}
                    className={`flex items-center gap-2 rounded-lg border p-2 text-left text-xs transition-all ${
                      selected ? "border-ares-sea bg-ares-foam/50" : "border-ares-line hover:border-ares-sea/40"
                    }`}
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded ${
                      selected ? "bg-ares-sea-deep text-white" : "border border-ares-line"
                    }`}>
                      {selected && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    <span className="text-ares-navy">{a.label}</span>
                  </button>
                );
              })}
            </div>
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
              {loading ? "Creating…" : "Create automation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
