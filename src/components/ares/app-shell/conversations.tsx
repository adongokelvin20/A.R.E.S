"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, ArrowLeft, User, Bot, ChevronDown, ChevronRight, Flag } from "lucide-react";

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

export function AresConversations({ data }: { data: any }) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [allMessages, setAllMessages] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const json = await res.json();
      setGroups(json.groups ?? []);
    } catch (e) {
      setGroups([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function expandGroup(key: string) {
    if (expandedKey === key) {
      setExpandedKey(null);
      setAllMessages(null);
      return;
    }
    setExpandedKey(key);
    setAllMessages(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations?customer=${encodeURIComponent(key)}`);
      const json = await res.json();
      const convos = json.conversations ?? [];
      const allMsgs: Message[] = [];
      for (const c of convos) {
        const msgRes = await fetch(`/api/conversations?id=${c.id}`);
        const msgJson = await msgRes.json();
        if (msgJson.conversation?.messages) {
          allMsgs.push(...msgJson.conversation.messages);
        }
      }
      allMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setAllMessages(allMsgs);
    } catch (e) {
      setAllMessages([]);
    } finally {
      setLoading(false);
    }
  }

  if (expandedKey && allMessages) {
    const group = groups?.find(g => g.key === expandedKey);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setExpandedKey(null); setAllMessages(null); }} className="rounded-lg border border-ares-line bg-white p-2 text-ares-navy hover:border-ares-sea/40">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-ares-navy">{group?.customerName || "Customer"}</h2>
            <p className="text-xs text-muted-foreground">
              {group?.customerPhone && `${group.customerPhone} · `}
              {allMessages.length} messages
            </p>
          </div>
        </div>

        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto ares-scroll rounded-2xl border border-ares-line bg-white p-4">
          <div className="space-y-3">
            {allMessages.map((m) => {
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
            {allMessages.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No messages.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ares-navy">Conversations</h2>
        <p className="text-xs text-muted-foreground">
          {groups?.length ?? 0} customer{(groups?.length ?? 0) === 1 ? "" : "s"} · click any to read the full conversation
        </p>
      </div>

      {groups && groups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ares-line bg-white p-10 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold text-ares-navy">No conversations yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            When customers message your assistant (via WhatsApp or the chat panel), their conversations will appear here, grouped by customer.
          </p>
        </div>
      )}

      {groups && groups.length > 0 && (
        <div className="space-y-2">
          {groups.map((g) => {
            const isExpanded = expandedKey === g.key;
            return (
              <div key={g.key} className="overflow-hidden rounded-2xl border border-ares-line bg-white">
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
                      <span>{g.totalMessages} messages</span>
                      <span>·</span>
                      <span>Last active {new Date(g.lastActivity).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
