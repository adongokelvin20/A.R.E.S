"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Brain, TrendingUp, AlertCircle } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How did we perform this week?",
  "What are our best-selling products?",
  "Which customers haven't ordered recently?",
  "Summarize today's activity",
  "What needs my attention right now?",
  "How's our revenue trending?",
];

export function AresOwnerChat({ data }: { data: any }) {
  const agentName = data.business.agentName;
  const businessName = data.business.name;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");

    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/ares/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: next.slice(-8).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
          mode: "owner",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || json?.error || "Request failed");
      setMessages((prev) => [...prev, { role: "assistant", content: json.reply }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `I couldn't process that. ${e?.message ?? "Please try again."}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-2xl border border-ares-line bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ares-line bg-gradient-to-r from-ares-navy to-ares-sea-deep p-4 text-white">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="ares-avatar-glow h-10 w-10 overflow-hidden rounded-full">
              <img
                src="/images/ai-avatar.jpg"
                alt={agentName}
                className="ares-avatar-breathe h-full w-full object-cover"
              />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ares-navy bg-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-semibold">{agentName} -- Business Analysis</div>
            <div className="text-[11px] text-white/70">Your private business assistant</div>
          </div>
        </div>
        <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium text-white/90 backdrop-blur-sm">
          Owner only
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto ares-scroll bg-ares-mist p-4">
        <div className="space-y-3">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ares-foam text-ares-sea-deep">
                <Brain className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-medium text-ares-navy">Business Analysis Chat</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ask about sales, customers, trends, or anything about your business.
                This is private -- customers never see this chat.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-ares-navy text-white" : "bg-ares-sea-deep text-white"}`}>
                {m.role === "user" ? <TrendingUp className="h-3.5 w-3.5" /> : <Brain className="h-3.5 w-3.5" />}
              </div>
              <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-ares-navy text-white" : "border border-ares-line bg-white text-ares-navy"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ares-sea-deep text-white">
                <Brain className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl border border-ares-line bg-white px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ares-sea [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ares-sea [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ares-sea" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions */}
      <div className="border-t border-ares-line bg-white p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={loading}
              className="rounded-lg border border-ares-line bg-ares-mist px-2.5 py-1.5 text-[11px] font-medium text-ares-navy transition-colors hover:border-ares-sea/40 hover:text-ares-sea-deep disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about your business..."
            className="flex-1 rounded-xl border border-ares-line bg-white px-3.5 py-2.5 text-sm text-ares-navy placeholder:text-muted-foreground focus:border-ares-sea/40 focus:outline-none focus:ring-2 focus:ring-ares-sea/15"
            disabled={loading}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ares-sea-deep text-white transition-colors hover:bg-ares-navy disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 text-[10px] text-muted-foreground">
          Private chat for business analysis. Customers cannot access this.
        </div>
      </div>
    </div>
  );
}
