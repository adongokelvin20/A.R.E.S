"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ArrowLeft, Phone, MoreVertical, Check, CheckCheck, MessageSquare, RefreshCw, Lock } from "lucide-react";

interface Group {
  key: string;
  customerName: string;
  customerPhone: string | null;
  conversationCount: number;
  conversationIds: string[];
  totalMessages: number;
  lastActivity: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  metadata?: string;
}

interface Conversation {
  id: string;
  channel: string;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  lastMessageAt: string;
  messages: Message[];
}

function timeShort(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name: string) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

const AVATAR_COLORS = ["#25D366", "#075E54", "#128C7E", "#34B7F1", "#ECE5DD", "#128C7E", "#0A1626", "#0369A1"];
function avatarColor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function AresConversations({ data }: { data: any }) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [search, setSearch] = useState("");
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const agentName = data?.business?.agentName ?? "Assistant";

  const load = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/conversations");
      const json = await res.json();
      setGroups(json.groups ?? []);
    } catch {
      setGroups([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-scroll thread to bottom on new messages
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [thread, loadingThread]);

  // Select a customer group -> load their conversations
  async function selectGroup(g: Group) {
    setSelectedGroup(g);
    setMobileShowThread(true);
    setLoadingThread(true);
    setThread([]);
    try {
      const res = await fetch(`/api/conversations?customer=${encodeURIComponent(g.key)}`);
      const json = await res.json();
      const convos = json.conversations ?? [];
      setConversations(convos);
      // Auto-open the most recent conversation
      if (convos.length > 0) {
        await openConversation(convos[0]);
      }
    } catch {
      setConversations([]);
    } finally {
      setLoadingThread(false);
    }
  }

  // Open a specific conversation thread
  async function openConversation(c: Conversation) {
    setActiveConvo(c);
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/conversations?id=${c.id}`);
      const json = await res.json();
      setThread(json.conversation?.messages ?? []);
    } catch {
      setThread([]);
    } finally {
      setLoadingThread(false);
    }
  }

  const filteredGroups = (groups ?? []).filter((g) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (g.customerName ?? "").toLowerCase().includes(q) || (g.customerPhone ?? "").toLowerCase().includes(q);
  });

  // ===== Empty state =====
  if (groups && groups.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-ares-navy">Conversations</h2>
          <p className="text-xs text-muted-foreground">Customer chats from WhatsApp and your store</p>
        </div>
        <div className="rounded-2xl border border-dashed border-ares-line bg-white p-10 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold text-ares-navy">No conversations yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            When customers message your assistant (via WhatsApp or your store link), their chats appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] overflow-hidden rounded-2xl border border-ares-line bg-white sm:h-[calc(100vh-160px)]">
      {/* ===== Left pane: chat list (WhatsApp style) ===== */}
      <div className={`flex flex-col border-r border-ares-line ${mobileShowThread ? "hidden w-0 sm:flex sm:w-80" : "w-full sm:w-80"}`}>
        {/* Header */}
        <div className="flex items-center gap-2 bg-[#075E54] px-4 py-3 text-white">
          <h2 className="flex-1 text-sm font-semibold">Conversations</h2>
          <button onClick={load} className="rounded-lg p-1.5 text-white/80 hover:bg-white/10" aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`} />
          </button>
        </div>
        {/* Search */}
        <div className="border-b border-ares-line bg-[#F0F2F5] px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="flex-1 bg-transparent text-sm text-ares-navy placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {loadingList && groups === null ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            filteredGroups.map((g) => {
              const isActive = selectedGroup?.key === g.key;
              const lastMsg = g.totalMessages > 0 ? `${g.totalMessages} message${g.totalMessages === 1 ? "" : "s"}` : "No messages";
              return (
                <button
                  key={g.key}
                  onClick={() => selectGroup(g)}
                  className={`flex w-full items-center gap-3 border-b border-ares-line/50 px-3 py-3 text-left transition-colors hover:bg-[#F0F2F5] ${isActive ? "bg-[#ECE5DD]" : ""}`}
                >
                  {/* Avatar */}
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
                    style={{ background: avatarColor(g.key) }}
                  >
                    {initials(g.customerName || g.customerPhone || "?")}
                  </div>
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ares-navy">{g.customerName || g.customerPhone || "Unknown"}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{timeShort(g.lastActivity)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">{lastMsg}</span>
                      {g.conversationCount > 1 && (
                        <span className="shrink-0 rounded-full bg-ares-sea/20 px-1.5 py-0.5 text-[9px] font-semibold text-ares-sea-deep">
                          {g.conversationCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
          {filteredGroups.length === 0 && !loadingList && (
            <p className="py-8 text-center text-xs text-muted-foreground">No customers match "{search}"</p>
          )}
        </div>
      </div>

      {/* ===== Right pane: active conversation (WhatsApp style) ===== */}
      <div className={`flex flex-1 flex-col ${mobileShowThread ? "flex" : "hidden sm:flex"}`}>
        {activeConvo ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 bg-[#075E54] px-4 py-2.5 text-white">
              <button
                onClick={() => setMobileShowThread(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 sm:hidden"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ background: avatarColor(selectedGroup?.key ?? activeConvo.id) }}
              >
                {initials(selectedGroup?.customerName || activeConvo.customerName || activeConvo.customerPhone || "?")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  {selectedGroup?.customerName || activeConvo.customerName || activeConvo.customerPhone || "Customer"}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-white/70">
                  <span className={`h-1.5 w-1.5 rounded-full ${activeConvo.status === "OPEN" ? "bg-emerald-400" : "bg-white/40"}`} />
                  {activeConvo.status === "OPEN" ? "online" : "closed"} · {activeConvo.channel === "WHATSAPP" ? "WhatsApp" : "Store chat"}
                </div>
              </div>
              <button className="rounded-lg p-1.5 text-white/80 hover:bg-white/10" aria-label="Call">
                <Phone className="h-4 w-4" />
              </button>
              <button className="rounded-lg p-1.5 text-white/80 hover:bg-white/10" aria-label="More">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>

            {/* Messages area — WhatsApp-style chat wallpaper */}
            <div
              ref={threadRef}
              className="flex-1 overflow-y-auto px-4 py-4"
              style={{ backgroundColor: "#E5DDD5", backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4cabf' fill-opacity='0.15'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10S0 14.5 0 20s4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E\")" }}
            >
              {loadingThread ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="h-6 w-6 animate-spin text-[#075E54]" />
                </div>
              ) : thread.length === 0 ? (
                <p className="py-10 text-center text-xs text-[#075E54]/60">No messages yet</p>
              ) : (
                <div className="mx-auto max-w-3xl space-y-1.5">
                  {thread.map((m, i) => {
                    const isCustomer = m.role === "CUSTOMER";
                    const isAI = m.role === "AI";
                    const isHuman = m.role === "HUMAN";
                    const isOutgoing = isAI || isHuman;
                    const prevDate = i > 0 ? new Date(thread[i - 1].createdAt).toDateString() : null;
                    const currDate = new Date(m.createdAt).toDateString();
                    const showDateSep = i === 0 || prevDate !== currDate;
                    const meta = m.metadata ? JSON.parse(m.metadata) : {};
                    return (
                      <div key={m.id}>
                        {showDateSep && (
                          <div className="my-3 flex justify-center">
                            <span className="rounded-lg bg-[#E1F2FA] px-3 py-1 text-[10px] font-medium text-[#075E54] shadow-sm">
                              {new Date(m.createdAt).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`relative max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm sm:max-w-[60%] ${
                              isOutgoing
                                ? "bg-[#DCF8C6] text-[#075E54]"
                                : "bg-white text-[#303030]"
                            }`}
                          >
                            {isAI && (
                              <div className="mb-0.5 text-[10px] font-semibold text-[#075E54]">
                                {agentName}
                              </div>
                            )}
                            {isHuman && (
                              <div className="mb-0.5 text-[10px] font-semibold text-[#075E54]">
                                You · Owner
                              </div>
                            )}
                            <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                            {/* Product images */}
                            {meta.images && meta.images.length > 0 && (
                              <div className="mt-2 grid grid-cols-2 gap-1">
                                {meta.images.map((img: any, idx: number) => (
                                  <img key={idx} src={img.imageUrl} alt={img.name} className="h-20 w-full rounded object-cover" />
                                ))}
                              </div>
                            )}
                            {/* Timestamp + ticks (WhatsApp style) */}
                            <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-[#075E54]/60">
                              {timeShort(m.createdAt)}
                              {isOutgoing && <CheckCheck className="h-3 w-3" />}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Read-only info bar — owner views conversations, doesn't reply */}
            <div className="flex items-center justify-center gap-2 bg-[#F0F2F5] px-3 py-2.5 text-center text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" />
              Read-only · This is a conversation between your customer and {agentName}
            </div>
          </>
        ) : (
          // No conversation selected
          <div className="flex flex-1 items-center justify-center bg-[#F0F2F5] p-8 text-center">
            <div>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#075E54]">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-[#075E54]">Select a conversation</h3>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Choose a customer from the list to read their conversation with {agentName}. You can see what customers are asking and how your assistant is handling them.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
