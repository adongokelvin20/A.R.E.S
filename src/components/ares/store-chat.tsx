"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Loader2, ShoppingBag, X, ArrowLeft, Check, CheckCheck, Phone, MoreVertical } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  category: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  inStock: boolean;
  attributes: any;
}

interface StoreChatProps {
  slug: string;
  businessName: string;
  agentName: string;
  products: Product[];
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
  let id = localStorage.getItem("ares-store-session");
  if (!id) {
    id = genId();
    localStorage.setItem("ares-store-session", id);
  }
  return id;
}

function timeShort(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const CURRENCY_SYMBOL: Record<string, string> = {
  GHS: "GH₵", NGN: "₦", KES: "KSh", USD: "$", GBP: "£", ZAR: "R", EUR: "€",
};
function sym(cur: string) {
  return CURRENCY_SYMBOL[cur] ?? cur + " ";
}

export function StoreChat({ slug, businessName, agentName, products }: StoreChatProps) {
  // Initial greeting — lazy initializer so we don't setState in an effect
  const [messages, setMessages] = useState<Msg[]>(() => [
    {
      role: "assistant",
      content: `Hi! I'm ${agentName}, your assistant at ${businessName}. How can I help you today? 😊`,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [sessionId] = useState(getOrCreateSessionId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
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

      // Try the request up to 2 times — if the first fails, retry once
      let lastError = "";
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch("/api/store/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug,
              message: msg,
              sessionId,
              history: messages.slice(-8).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
            }),
          });
          const j = await res.json();
          if (j.reply) {
            setMessages((m) => [...m, { role: "assistant", content: j.reply, images: j.images ?? [], createdAt: new Date().toISOString() }]);
            setLoading(false);
            return;
          } else if (j.error) {
            lastError = j.error;
          } else {
            lastError = "No reply received";
          }
        } catch (e) {
          lastError = "Network error";
        }
        // Wait 1s before retrying
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
      }

      // Both attempts failed — show a helpful message
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `I'm having trouble responding right now — our server might be warming up. Please try sending your message again in a few seconds.`,
          createdAt: new Date().toISOString(),
        },
      ]);
      setLoading(false);
    },
    [input, loading, slug, sessionId, messages]
  );

  return (
    <>
      {/* Floating chat bubble (WhatsApp green) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-600/30 transition-transform hover:scale-105"
          aria-label="Chat with us"
        >
          <MessageCircle className="h-6 w-6" />
          {messages.length > 1 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {messages.length - 1}
            </span>
          )}
        </button>
      )}

      {/* Chat panel — WhatsApp style */}
      {open && (
        <div className="fixed inset-0 z-50 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-96">
          <div className="flex h-full flex-col overflow-hidden bg-white shadow-2xl sm:h-[600px] sm:rounded-2xl">
            {/* Header — WhatsApp green */}
            <div className="flex items-center gap-3 bg-[#075E54] px-4 py-2.5 text-white">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 sm:hidden"
                aria-label="Close"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
                {agentName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{agentName}</div>
                <div className="flex items-center gap-1 text-[11px] text-white/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  online · {businessName}
                </div>
              </div>
              <button className="rounded-lg p-1.5 text-white/80 hover:bg-white/10" aria-label="Call">
                <Phone className="h-4 w-4" />
              </button>
              <button onClick={() => setOpen(false)} className="hidden rounded-lg p-1.5 text-white/80 hover:bg-white/10 sm:block" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages area — WhatsApp chat wallpaper */}
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
                      <div
                        className={`relative max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                          isUser ? "bg-[#DCF8C6] text-[#075E54]" : "bg-white text-[#303030]"
                        }`}
                      >
                        {!isUser && (
                          <div className="mb-0.5 text-[10px] font-semibold text-[#075E54]">
                            {agentName}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                        {/* Product images */}
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
                        {/* Timestamp + ticks */}
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

            {/* Quick product suggestions (only at start) */}
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

            {/* Input bar — WhatsApp style */}
            <div className="flex items-center gap-2 bg-[#F0F2F5] px-3 py-2.5">
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
        </div>
      )}
    </>
  );
}
