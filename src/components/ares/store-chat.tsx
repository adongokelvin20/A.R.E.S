"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Loader2, ShoppingBag, X } from "lucide-react";

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

const CURRENCY_SYMBOL: Record<string, string> = {
  GHS: "GH₵", NGN: "₦", KES: "KSh", USD: "$", GBP: "£", ZAR: "R", EUR: "€",
};
function sym(cur: string) {
  return CURRENCY_SYMBOL[cur] ?? cur + " ";
}

export function StoreChat({ slug, businessName, agentName, products }: StoreChatProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [sessionId] = useState(getOrCreateSessionId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial greeting from the assistant
  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `Hi! I'm ${agentName}, your assistant at ${businessName}. How can I help you today?`,
      },
    ]);
  }, [agentName, businessName]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || loading) return;
      const userMsg: Msg = { role: "user", content: msg };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      setLoading(true);
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
          setMessages((m) => [...m, { role: "assistant", content: j.reply, images: j.images ?? [] }]);
        } else {
          setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't process that. Could you try again?" }]);
        }
      } catch (e) {
        setMessages((m) => [...m, { role: "assistant", content: "Connection issue — please try again in a moment." }]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, slug, sessionId, messages]
  );

  return (
    <>
      {/* Floating chat bubble (when closed) */}
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

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96">
          <div className="flex h-[80vh] flex-col overflow-hidden rounded-t-3xl border border-ares-line bg-white shadow-2xl sm:h-[600px] sm:rounded-3xl">
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-br from-ares-navy to-ares-sea-deep p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{agentName}</div>
                  <div className="flex items-center gap-1 text-[11px] text-white/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Online · {businessName}
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10" aria-label="Close chat">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-ares-mist/30 p-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-ares-navy text-white"
                        : "bg-white text-ares-navy border border-ares-line"
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    {m.images && m.images.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {m.images.map((img: any, idx: number) => (
                          <div key={idx} className="overflow-hidden rounded-lg border border-ares-line">
                            <img src={img.imageUrl} alt={img.name} className="h-20 w-full object-cover" />
                            <div className="bg-white px-1.5 py-1 text-[10px]">
                              <div className="font-medium text-ares-navy">{img.name}</div>
                              <div className="text-muted-foreground">{sym(img.currency)}{img.price.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-white px-4 py-3 border border-ares-line">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-ares-sea/40" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-ares-sea/40" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-ares-sea/40" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick product suggestions */}
            {messages.length <= 1 && products.length > 0 && (
              <div className="border-t border-ares-line bg-white px-3 py-2">
                <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Popular</div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {products.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => send(`Tell me about ${p.name}`)}
                      className="shrink-0 rounded-full border border-ares-line bg-ares-mist/40 px-3 py-1 text-[11px] text-ares-navy hover:bg-ares-mist"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-ares-line bg-white p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="max-h-24 flex-1 resize-none rounded-xl border border-ares-line bg-white px-3 py-2.5 text-sm text-ares-navy placeholder:text-muted-foreground focus:border-ares-sea/40 focus:outline-none"
                />
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ares-navy text-white transition-colors hover:bg-ares-sea-deep disabled:opacity-40"
                  aria-label="Send"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                Powered by A.R.E.S. · {businessName}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
