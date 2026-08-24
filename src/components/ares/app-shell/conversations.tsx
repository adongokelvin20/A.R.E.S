"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, ArrowLeft, User, Bot, ChevronDown, ChevronRight, RefreshCw, Flag } from "lucide-react";

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

export function AresConversations({ data }: { data: any }) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [thread, setThread] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const json = await res.json();
      setGroups(json.groups ?? []);
    } catch (e) {
      console.error("Failed to load conversations", e);
      setGroups([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load all conversations for an expanded customer group
  async function expandGroup(key: string) {
    if (expandedKey === key) {
      setExpandedKey(null);
      setConversations(null);
      setThread(null);
      return;
    }
    setExpandedKey(key);
    setConversations(null);
    setThread(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations?customer=${encodeURIComponent(key)}`);
      const json = await res.json();
      const convos = json.conversations ?? [];
      setConversations(convos);

      // Fetch ALL messages from ALL conversations into one continuous thread
      const allMsgs: any[] = [];
      for (const c of convos) {
        const msgRes = await fetch(`/api/conversations?id=${c.id}`);
        const msgJson = await msgRes.json();
        if (msgJson.conversation?.messages) {
          allMsgs.push(...msgJson.conversation.messages);
        }
      }
      // Sort by date so it reads like one continuous conversation
      allMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setThread(allMsgs);
    } catch (e) {
      console.error("Failed to load customer conversations", e);
      setConversations([]);
      setThread([]);
    } finally {
      setLoading(false);
    }
  }

  // Load a single conversation thread
  async function openThread(id: string) {
    setSelectedConvoId(id);
    setThread(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations?id=${id}`);
      const json = await res.json();
      setThread(json.conversation?.messages ?? []);
    } catch (e) {
      console.error("Failed to load thread", e);
      setThread([]);
    } finally {
      setLoading(false);
    }
  }

  // Full thread view
  if (selectedConvoId && thread) {
    const convo = conversations?.find((c) => c.id === selectedConvoId);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedConvoId(null); setThread(null); }} className="rounded-lg border border-ares-line bg-white p-2 text-ares-navy hover:border-ares-sea/40">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-ares-navy">
              {convo?.customerName || convo?.customerPhone || "Conversation"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {convo?.channel} · {thread.length} messages
            </p>
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border border-ares-line bg-white p-4">
          {thread.map((m) => {
            let isFlagged = false;
            try { isFlagged = JSON.parse(m.metadata || "{}")?.flagged === true; } catch {}
            return (
            <div key={m.id} className={`flex gap-2.5 ${m.role === "CUSTOMER" ? "" : "flex-row-reverse"}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.role === "CUSTOMER" ? "bg-ares-navy text-white" : m.role === "AI" ? "bg-ares-sea-deep text-white" : "bg-slate-400 text-white"}`}>
                {m.role === "CUSTOMER" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === "CUSTOMER" ? "bg-ares-mist text-ares-navy" : m.role === "AI" ? "bg-ares-sea-deep text-white" : "bg-slate-100 text-slate-700"}`}>
                {isFlagged && (
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                    <Flag className="h-3 w-3" /> Flagged for owner
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div className={`mt-1 text-[10px] ${m.role === "AI" ? "text-white/60" : "text-muted-foreground"}`}>
                  {new Date(m.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {m.role === "AI" && " · Assistant"}
                  {m.role === "CUSTOMER" && " · Customer"}
                </div>
              </div>
            </div>
            );
          })}
          {thread.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No messages in this conversation.</p>
          )}
        </div>
      </div>
    );
  }

  // List view -- grouped by customer
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ares-navy">Conversations</h2>
        <p className="text-xs text-muted-foreground">
          {groups?.length ?? 0} customer{groups?.length === 1 ? "" : "s"} · click any to see all their conversations
        </p>
      </div>

      {groups && groups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ares-line bg-white p-10 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold text-ares-navy">No conversations yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            When customers message your AI (via WhatsApp or the chat panel), their conversations will appear here, grouped by customer.
          </p>
        </div>
      )}

      {groups && groups.length > 0 && (
        <div className="space-y-2">
          {groups.map((g) => {
            const isExpanded = expandedKey === g.key;
            return (
              <div key={g.key} className="overflow-hidden rounded-2xl border border-ares-line bg-white">
                {/* Customer header -- click to expand */}
                <button
                  onClick={() => expandGroup(g.key)}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-ares-mist"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ares-foam text-ares-sea-deep">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ares-navy">{g.customerName}</span>
                      {g.customerPhone && (
                        <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">{g.customerPhone}</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{g.conversationCount} conversation{g.conversationCount === 1 ? "" : "s"}</span>
                      <span>·</span>
                      <span>Last active {new Date(g.lastActivity).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>

                {/* Expanded: show all conversations for this customer */}
                {isExpanded && (
                  <div className="border-t border-ares-line bg-ares-mist/50 p-3">
                    {loading ? (
                      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading conversations...
                      </div>
                    ) : conversations && conversations.length > 0 ? (
                      <div className="space-y-2">
                        {conversations.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => openThread(c.id)}
                            className="flex w-full items-center gap-3 rounded-xl border border-ares-line bg-white p-3 text-left transition-all hover:border-ares-sea/30 hover:shadow-sm"
                          >
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${c.channel === "WHATSAPP" ? "bg-emerald-50 text-emerald-600" : "bg-ares-foam text-ares-sea-deep"}`}>
                              <MessageSquare className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-ares-foam px-1.5 py-0.5 text-[10px] font-medium text-ares-sea-deep">{c.channel}</span>
                                <span className={`h-1.5 w-1.5 rounded-full ${c.status === "OPEN" ? "bg-emerald-500" : "bg-slate-400"}`} />
                                <span className="text-[10px] text-muted-foreground">{c.status}</span>
                              </div>
                              {c.messages[0] && (
                                <div className="mt-1 truncate text-xs text-muted-foreground">
                                  <span className="font-medium">{c.messages[0].role === "AI" ? `${data.business.agentName}: ` : "Customer: "}</span>
                                  {c.messages[0].content}
                                </div>
                              )}
                            </div>
                            <div className="shrink-0 text-[10px] text-muted-foreground">
                              {new Date(c.lastMessageAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="py-4 text-center text-xs text-muted-foreground">No conversations found.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
