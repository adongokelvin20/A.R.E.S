"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Loader2, X, CheckCheck, Paperclip } from "lucide-react";

interface EmbedClientProps {
  business: { id: string; name: string; slug: string; agentName: string; currency: string };
  products: { id: string; name: string; price: number; currency: string; imageUrl: string | null }[];
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  images?: any[];
  createdAt: string;
}

function genId() {
  return "sess-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getOrCreateSessionId() {
  if (typeof window === "undefined") return genId();
  let id = localStorage.getItem("ares-embed-session");
  if (!id) {
    id = genId();
    localStorage.setItem("ares-embed-session", id);
  }
  return id;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  GHS: "GH₵", NGN: "₦", KES: "KSh", USD: "$", GBP: "£", ZAR: "R", EUR: "€",
};
function sym(cur: string) {
  return CURRENCY_SYMBOL[cur] ?? cur + " ";
}

function timeShort(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function EmbedClient({ business, products }: EmbedClientProps) {
  const agentName = business.agentName || "Assistant";
  const [messages, setMessages] = useState<Msg[]>(() => [
    {
      role: "assistant",
      content: `Hi! I'm ${agentName}, your assistant at ${business.name}. How can I help you today? 😊`,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(getOrCreateSessionId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || loading) return;
      const userMsg: Msg = { role: "user", content: msg, createdAt: new Date().toISOString() };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/store/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: business.slug,
            message: msg,
            sessionId,
            // Send up to 100 messages of history
            history: messages.slice(-100).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
          }),
        });
        const j = await res.json();
        if (j.reply) {
          setMessages((m) => [...m, { role: "assistant", content: j.reply, images: j.images ?? [], createdAt: new Date().toISOString() }]);
        } else {
          setMessages((m) => [...m, { role: "assistant", content: "I'm having trouble responding. Please try again.", createdAt: new Date().toISOString() }]);
        }
      } catch {
        setMessages((m) => [...m, { role: "assistant", content: "Network error. Please try again.", createdAt: new Date().toISOString() }]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, business.slug, sessionId, messages]
  );

  const uploadScreenshot = useCallback(
    async (file: File) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setMessages((m) => [...m, { role: "user", content: "📷 Payment screenshot uploaded", images: [{ imageUrl: base64, name: "Payment proof", price: 0, currency: "" }], createdAt: new Date().toISOString() }]);
        setLoading(true);
        try {
          const verifyRes = await fetch("/api/store/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: business.slug, sessionId, imageBase64: base64 }),
          });
          const verifyData = await verifyRes.json();
          setMessages((m) => [...m, { role: "assistant", content: verifyData.reason ?? verifyData.error ?? "Verification failed.", createdAt: new Date().toISOString() }]);
        } catch {
          setMessages((m) => [...m, { role: "assistant", content: "I couldn't analyze that screenshot. Please try again.", createdAt: new Date().toISOString() }]);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    },
    [business.slug, sessionId]
  );

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#075E54] px-4 py-2.5 text-white">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
          {agentName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{agentName}</div>
          <div className="flex items-center gap-1 text-[11px] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            online · {business.name}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4"
        style={{ backgroundColor: "#E5DDD5", backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4cabf' fill-opacity='0.15'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10S0 14.5 0 20s4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E\")" }}
      >
        <div className="mx-auto max-w-md space-y-1.5">
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`relative max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm ${isUser ? "bg-[#DCF8C6] text-[#075E54]" : "bg-white text-[#303030]"}`}>
                  {!isUser && <div className="mb-0.5 text-[10px] font-semibold text-[#075E54]">{agentName}</div>}
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                  {m.images && m.images.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {m.images.map((img: any, idx: number) => (
                        <div key={idx} className="overflow-hidden rounded">
                          <img src={img.imageUrl} alt={img.name} className="h-20 w-full object-cover" />
                          <div className="bg-white px-1.5 py-1 text-[10px]">
                            <div className="font-medium text-[#075E54]">{img.name}</div>
                            <div className="text-[#075E54]/60">{sym(img.currency)}{img.price.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-[#075E54]/60">
                    {timeShort(m.createdAt)}
                    {isUser && <CheckCheck className="h-3 w-3" />}
                  </div>
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#075E54]/40" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#075E54]/40" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#075E54]/40" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick product suggestions */}
      {messages.length <= 1 && products.length > 0 && (
        <div className="border-t border-[#E5DDD5] bg-white px-3 py-2">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Popular</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {products.slice(0, 4).map((p) => (
              <button
                key={p.id}
                onClick={() => send(`Tell me about ${p.name}`)}
                className="shrink-0 rounded-full border border-[#25D366]/30 bg-[#DCF8C6]/30 px-3 py-1 text-[11px] text-[#075E54] hover:bg-[#DCF8C6]/50"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 bg-[#F0F2F5] px-3 py-2.5">
        <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-[#075E54] hover:bg-ares-mist" title="Upload payment screenshot">
          <Paperclip className="h-5 w-5" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadScreenshot(file);
              e.target.value = "";
            }}
          />
        </label>
        <div className="flex flex-1 items-center rounded-full bg-white px-4 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm text-[#075E54] placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white transition-transform hover:scale-105 disabled:opacity-40"
          aria-label="Send"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
