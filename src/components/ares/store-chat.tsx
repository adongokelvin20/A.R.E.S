"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Loader2, ShoppingBag, X, ArrowLeft, Check, CheckCheck, Phone, MoreVertical, Paperclip, History, Mic, Volume2 } from "lucide-react";

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
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  paymentEnabled?: boolean;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  images?: any[];
  createdAt: string;
  id?: string;
}

function genId() {
  return "sess-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getOrCreateSessionId() {
  if (typeof window === "undefined") return genId();
  // Use a stable session ID per device (for customer recognition)
  let id = localStorage.getItem("ares-store-session");
  if (!id) {
    id = genId();
    localStorage.setItem("ares-store-session", id);
  }
  return id;
}

// Generate a unique chat ID for each new conversation
function genChatId() {
  return "chat-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Get all saved chats for a store
function getSavedChats(slug: string): { id: string; messages: Msg[]; createdAt: string }[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(`ares-chats-${slug}`);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

// Save a chat to the list
function saveChat(slug: string, chatId: string, messages: Msg[]) {
  if (typeof window === "undefined") return;
  try {
    const chats = getSavedChats(slug);
    const existing = chats.find((c) => c.id === chatId);
    if (existing) {
      existing.messages = messages.slice(-50);
      existing.createdAt = new Date().toISOString();
    } else {
      chats.unshift({ id: chatId, messages: messages.slice(-50), createdAt: new Date().toISOString() });
    }
    // Keep only last 10 chats
    localStorage.setItem(`ares-chats-${slug}`, JSON.stringify(chats.slice(0, 10)));
  } catch {}
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

export function StoreChat({ slug, businessName, agentName, products, externalOpen, onOpenChange, paymentEnabled = true }: StoreChatProps) {
  const [chatId] = useState(() => genChatId());
  // Start fresh each time — new chat
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
  const [showHistory, setShowHistory] = useState(false);
  const [savedChats, setSavedChats] = useState<{ id: string; messages: Msg[]; createdAt: string }[]>([]);
  const [viewingOldChat, setViewingOldChat] = useState<Msg[] | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [viewingImage, setViewingImage] = useState<any>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Notify parent when open state changes
  const handleSetOpen = (val: boolean) => {
    setOpen(val);
    onOpenChange?.(val);
  };

  // Sync with external open state (from the "Chat with agent" button)
  useEffect(() => {
    if (externalOpen) handleSetOpen(true);
  }, [externalOpen]);
  const [sessionId] = useState(getOrCreateSessionId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Save current chat to localStorage on every message change
  useEffect(() => {
    if (messages.length > 1) {
      saveChat(slug, chatId, messages);
    }
  }, [messages, slug, chatId]);

  // Load saved chats when history is opened
  useEffect(() => {
    if (showHistory) {
      setSavedChats(getSavedChats(slug));
    }
  }, [showHistory, slug]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Voice note recording
  const startRecording = useCallback(async () => {
    try {
      // Check if browser supports microphone
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMessages((m) => [...m, { role: "assistant", content: "Your browser doesn't support voice notes. Please type your message instead.", createdAt: new Date().toISOString() }]);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          // Add voice note to chat
          setMessages((m) => [...m, { role: "user", content: "🎤 Voice note — transcribing...", createdAt: new Date().toISOString() }]);
          setLoading(true);
          try {
            const res = await fetch("/api/store/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audio: base64 }),
            });
            const data = await res.json();
            if (data.text && data.text.trim()) {
              // Replace the "Voice note" placeholder with the transcribed text
              setMessages((m) => {
                const updated = [...m];
                updated[updated.length - 1] = { role: "user", content: data.text, createdAt: new Date().toISOString() };
                return updated;
              });
              // Now send the transcribed text to the chat API
              // We need to call the send function with the transcribed text
              // But we can't call send directly from here — use a workaround
              // by setting the input and triggering send
              // Actually, let's just call the chat API directly
              const chatRes = await fetch("/api/store/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  slug,
                  message: data.text,
                  sessionId,
                  history: messages.slice(-100).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
                }),
              });
              const chatJson = await chatRes.json();
              if (chatJson.reply) {
                setMessages((m) => [...m, { role: "assistant", content: chatJson.reply, images: chatJson.images ?? [], createdAt: new Date().toISOString() }]);
              }
            } else {
              setMessages((m) => [...m, { role: "assistant", content: "I couldn't hear that clearly. Could you type it instead?", createdAt: new Date().toISOString() }]);
            }
          } catch {
            setMessages((m) => [...m, { role: "assistant", content: "I couldn't process that voice note. Please type your message.", createdAt: new Date().toISOString() }]);
          } finally {
            setLoading(false);
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e: any) {
      console.error("Recording failed:", e);
      // Show user-friendly error message
      const errMsg = e?.name === "NotAllowedError"
        ? "Microphone access was denied. Please allow microphone access in your browser settings to use voice notes."
        : e?.name === "NotFoundError"
        ? "No microphone found on this device. Please type your message instead."
        : "Couldn't start recording. Please type your message instead.";
      setMessages((m) => [...m, { role: "assistant", content: errMsg, createdAt: new Date().toISOString() }]);
    }
  }, [slug, sessionId, messages]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Speak the agent's reply using Cloudflare TTS
  const speakReply = useCallback(async (text: string, msgId?: string) => {
    const id = msgId || `temp-${Date.now()}`;
    setSpeakingId(id);
    try {
      const res = await fetch("/api/store/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: "en" }),
      });
      const data = await res.json();
      if (data.audio) {
        const audio = new Audio(data.audio);
        audio.onended = () => setSpeakingId(null);
        audio.onerror = () => setSpeakingId(null);
        await audio.play();
      } else {
        setSpeakingId(null);
      }
    } catch (e) {
      console.error("TTS failed:", e);
      setSpeakingId(null);
    }
  }, []);

  const send = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || loading) return;
      const userMsg: Msg = { role: "user", content: msg, createdAt: new Date().toISOString() };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      setLoading(true);

      // Create a placeholder message for streaming
      const assistantMsgId = `streaming-${Date.now()}`;
      setMessages((m) => [...m, { role: "assistant", content: "", createdAt: new Date().toISOString(), id: assistantMsgId }]);

      try {
        const res = await fetch("/api/store/chat-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            message: msg,
            sessionId,
            history: messages.slice(-100).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream body");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullReply = "";
        let usedFallback = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (!data) continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "chunk" && parsed.text) {
                  fullReply += parsed.text;
                  // Update the streaming message
                  setMessages((m) => m.map((msg) => msg.id === assistantMsgId ? { ...msg, content: fullReply } : msg));
                } else if (parsed.type === "done") {
                  if (parsed.fallback) {
                    usedFallback = true;
                  } else if (parsed.reply) {
                    fullReply = parsed.reply;
                    setMessages((m) => m.map((msg) => msg.id === assistantMsgId ? { ...msg, content: fullReply } : msg));
                  }
                  if (parsed.orderCreated) {
                    setMessages((m) => m.map((msg) => msg.id === assistantMsgId ? { ...msg, content: fullReply + (fullReply ? "\n\n" : "") + `Your order code is [${parsed.orderCreated.orderCode}]. Use this as your payment reference.` } : msg));
                  }
                } else if (parsed.type === "error") {
                  throw new Error(parsed.error || "Stream error");
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }

        // If streaming returned empty or fallback, use the non-streaming endpoint
        if (!fullReply || usedFallback) {
          setMessages((m) => m.filter((msg) => msg.id !== assistantMsgId));
          // Fall back to non-streaming
          const res2 = await fetch("/api/store/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug,
              message: msg,
              sessionId,
              history: messages.slice(-100).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
            }),
          });
          const j = await res2.json();
          if (j.reply) {
            setMessages((m) => [...m, { role: "assistant", content: j.reply, images: j.images ?? [], createdAt: new Date().toISOString() }]);
          } else {
            setMessages((m) => [...m, { role: "assistant", content: "I'm having trouble responding right now. Please try again.", createdAt: new Date().toISOString() }]);
          }
        }

        setLoading(false);
        return;
      } catch (e) {
        // Remove the streaming placeholder and fall back to non-streaming
        setMessages((m) => m.filter((msg) => msg.id !== assistantMsgId));
        try {
          const res = await fetch("/api/store/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug,
              message: msg,
              sessionId,
              history: messages.slice(-100).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
            }),
          });
          const j = await res.json();
          if (j.reply) {
            setMessages((m) => [...m, { role: "assistant", content: j.reply, images: j.images ?? [], createdAt: new Date().toISOString() }]);
            setLoading(false);
            return;
          }
        } catch {}
        setMessages((m) => [...m, { role: "assistant", content: "I'm having trouble responding right now. Please try again.", createdAt: new Date().toISOString() }]);
      }

      setLoading(false);
    },
    [input, loading, slug, sessionId, messages]
  );


  // Listen for product clicks from the store page — opens the chat and sends an interest message
  useEffect(() => {
    function handleProductClick(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.productName) {
        handleSetOpen(true);
        setTimeout(() => {
          send(`I'm interested in the ${detail.productName}. Can you tell me more about it?`);
        }, 300);
      }
    }
    window.addEventListener("ares-product-click", handleProductClick as EventListener);
    return () => window.removeEventListener("ares-product-click", handleProductClick as EventListener);
  }, [send]);

  return (
    <>
      {/* Floating chat bubble (WhatsApp green) */}
      {!open && (
        <button
          onClick={() => handleSetOpen(true)}
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
                onClick={() => handleSetOpen(false)}
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
              <button onClick={() => { setShowHistory(!showHistory); setViewingOldChat(null); }} className="rounded-lg p-1.5 text-white/80 hover:bg-white/10" aria-label="Chat history" title="Previous chats">
                <History className="h-4 w-4" />
              </button>
              <button onClick={() => handleSetOpen(false)} className="hidden rounded-lg p-1.5 text-white/80 hover:bg-white/10 sm:block" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Old chat history viewer */}
            {showHistory && (
              <div className="border-b border-ares-line bg-white p-3 max-h-64 overflow-y-auto">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Previous chats</div>
                {savedChats.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-4">No previous chats</p>
                ) : (
                  <div className="space-y-1.5">
                    {savedChats.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => setViewingOldChat(chat.messages)}
                        className="flex w-full items-center gap-2 rounded-lg border border-ares-line p-2 text-left hover:bg-ares-mist"
                      >
                        <MessageCircle className="h-4 w-4 shrink-0 text-ares-sea-deep" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-ares-navy">
                            {chat.messages.find((m) => m.role === "user")?.content ?? "Chat"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(chat.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {chat.messages.length} messages
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {viewingOldChat && (
                  <div className="mt-3 border-t border-ares-line pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Viewing old chat</span>
                      <button onClick={() => setViewingOldChat(null)} className="text-[10px] text-ares-sea-deep hover:underline">Back to current chat</button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {viewingOldChat.map((m, i) => (
                        <div key={i} className={`text-xs ${m.role === "user" ? "text-right" : ""}`}>
                          <span className={`inline-block rounded-lg px-2.5 py-1.5 ${m.role === "user" ? "bg-ares-navy text-white" : "bg-ares-mist text-ares-navy"}`}>
                            {m.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                          <div className="mb-0.5 flex items-center justify-between">
                            <div className="text-[10px] font-semibold text-[#075E54]">
                              {agentName}
                            </div>
                            <button
                              onClick={() => speakReply(m.content, m.id)}
                              disabled={speakingId === m.id}
                              className="ml-2 flex h-5 w-5 items-center justify-center rounded-full text-[#075E54]/60 hover:bg-ares-foam hover:text-[#075E54] disabled:opacity-30"
                              title="Listen to this reply"
                            >
                              {speakingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Volume2 className="h-3 w-3" />}
                            </button>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                        {/* Product images — tappable to view full-size */}
                        {m.images && m.images.length > 0 && (
                          <div className="mt-2 grid grid-cols-2 gap-1">
                            {m.images.map((img: any, idx: number) => (
                              <div key={idx} className="overflow-hidden rounded cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setViewingImage(img)}>
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

            {/* Input bar — WhatsApp style with screenshot upload + voice */}
            <div className="flex items-center gap-2 bg-[#F0F2F5] px-3 py-2.5">
              {/* Screenshot upload button — only shown when payment is enabled */}
              {paymentEnabled && (
              <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-[#075E54] hover:bg-ares-mist" title="Upload payment screenshot">
                <Paperclip className="h-5 w-5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const base64 = reader.result as string;
                      // Add the image to the chat immediately
                      setMessages((m) => [...m, { role: "user", content: "📷 Payment screenshot uploaded", images: [{ imageUrl: base64, name: "Payment proof", price: 0, currency: "" }], createdAt: new Date().toISOString() }]);
                      // Show "analyzing..." 
                      setLoading(true);
                      try {
                        // Call the verify-payment API
                        const verifyRes = await fetch("/api/store/verify-payment", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ slug, sessionId, imageBase64: base64 }),
                        });
                        const verifyData = await verifyRes.json();
                        // Show the verification result
                        setMessages((m) => [...m, {
                          role: "assistant",
                          content: verifyData.reason ?? verifyData.error ?? "Verification failed.",
                          createdAt: new Date().toISOString(),
                        }]);
                      } catch {
                        setMessages((m) => [...m, {
                          role: "assistant",
                          content: "I couldn't analyze that screenshot. Please try again or contact the store.",
                          createdAt: new Date().toISOString(),
                        }]);
                      } finally {
                        setLoading(false);
                      }
                    };
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
              </label>
              )}
              <div className="flex flex-1 items-center rounded-full bg-white px-4 py-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-sm text-[#075E54] placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              {/* Voice note button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-transform hover:scale-105 disabled:opacity-40 ${isRecording ? "bg-red-500 animate-pulse" : "bg-[#075E54]"}`}
                aria-label={isRecording ? "Stop recording" : "Record voice note"}
                title={isRecording ? "Tap to stop recording" : "Hold to record voice note"}
              >
                <Mic className="h-4 w-4" />
              </button>
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

      {/* Full-screen image viewer */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setViewingImage(null)}
        >
          <button
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setViewingImage(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="max-h-[90vh] max-w-md" onClick={(e) => e.stopPropagation()}>
            <img src={viewingImage.imageUrl} alt={viewingImage.name} className="max-h-[80vh] w-auto rounded-xl object-contain" />
            <div className="mt-3 text-center text-white">
              <div className="text-sm font-semibold">{viewingImage.name}</div>
              {viewingImage.price > 0 && (
                <div className="text-xs text-white/70">{sym(viewingImage.currency)}{viewingImage.price.toFixed(2)}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
