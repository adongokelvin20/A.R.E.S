"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Bot, User, AlertCircle, RefreshCw } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  images?: { name: string; imageUrl: string; price: number; currency: string }[];
}

export function AresAiChatPanel({ data }: { data: any }) {
  const agentName = data.business.agentName;
  const businessName = data.business.name;
  const sector = data.business.sectorSubtype ?? data.business.type;
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: `Hi, I'm ${agentName} -- your digital employee for ${businessName}. I'm bound to your ${sector.replace(/_/g, " ").toLowerCase()} business and I only reference your real catalog. Ask me anything a customer would ask, or anything you'd want me to handle.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setError(null);

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
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || json?.error || "Request failed");
      setMessages((prev) => [...prev, { role: "assistant", content: json.reply, images: json.images }]);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I had trouble responding. ${e?.message ?? "Please try again."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = SUGGESTIONS[sector] ?? SUGGESTIONS.SERVICE;

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
            <div className="text-sm font-semibold">{agentName}</div>
            <div className="text-[11px] text-white/70">Your assistant</div>
          </div>
        </div>
        <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium text-white/90 backdrop-blur-sm">
          {sector.replace(/_/g, " ")}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto ares-scroll bg-ares-mist p-4">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-ares-navy text-white" : "bg-ares-sea-deep text-white"}`}>
                {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div className={`max-w-[80%] ${m.role === "user" ? "" : "space-y-2"}`}>
                <div className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-ares-navy text-white" : "border border-ares-line bg-white text-ares-navy"}`}>
                  {m.content}
                </div>
                {m.images && m.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {m.images.map((img, idx) => (
                      <ChatImage key={idx} img={img} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ares-sea-deep text-white">
                <Bot className="h-3.5 w-3.5" />
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
          {suggestions.map((s) => (
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
            placeholder={`Message ${agentName}…`}
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
        {error && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-600">
            <AlertCircle className="h-3 w-3" />
            {error}
          </div>
        )}
        <div className="mt-2 text-[10px] text-muted-foreground">
          {agentName} only answers using your business data. If it doesn't know, it says so honestly -- never fabricates.
        </div>
      </div>
    </div>
  );
}

const SUGGESTIONS: Record<string, string[]> = {
  CLOTHING_STORE: [
    "What products do you have?",
    "Do you have any black hoodies?",
    "What's your return policy?",
  ],
  RESTAURANT: [
    "What's on the menu?",
    "Can I book a table for 4 at 7pm?",
    "Do you deliver?",
  ],
  SCHOOL: [
    "When are fees due?",
    "What are the admission requirements?",
    "What are school hours?",
  ],
  REAL_ESTATE: [
    "What properties are available?",
    "What documents do I need to rent?",
    "Can I view a property before paying?",
  ],
  SERVICE: [
    "Can I book an appointment?",
    "Do you offer 24/7 service?",
    "Is there a call-out fee?",
  ],
};

/** Chat image with graceful error handling -- hides if the image fails to load. */
function ChatImage({ img }: { img: { name: string; imageUrl: string; price: number; currency: string } }) {
  const [errored, setErrored] = useState(false);
  if (errored) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-ares-line bg-white">
      <img
        src={img.imageUrl}
        alt={img.name}
        className="h-32 w-32 object-cover"
        onError={() => setErrored(true)}
      />
      <div className="p-1.5">
        <div className="truncate text-[11px] font-semibold text-ares-navy">{img.name}</div>
        <div className="font-mono text-[11px] text-ares-sea-deep">{img.currency === "GHS" ? "GH₵" : img.currency} {img.price.toFixed(2)}</div>
      </div>
    </div>
  );
}
