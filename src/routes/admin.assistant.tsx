import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Plus, Send, Trash2, Sparkles, Loader2, User as UserIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AdminPageHeader } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/assistant")({
  component: AssistantPage,
});

type Thread = { id: string; title: string; updated_at: string };
type Msg = { id: string; role: "user" | "assistant"; content: string; suggestions?: string[] | null; created_at: string };

const STARTER_SUGGESTIONS = [
  "What's today's overall student attendance?",
  "Which 5 LGAs have the lowest teacher attendance today?",
  "How many schools are in each category?",
  "Show me today's flagged teacher records",
];

function AssistantPage() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const threadsQ = useQuery({
    queryKey: ["assistant-threads"],
    queryFn: async (): Promise<Thread[]> => {
      const { data, error } = await supabase
        .from("assistant_threads")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const msgsQ = useQuery({
    queryKey: ["assistant-messages", activeId],
    enabled: !!activeId,
    queryFn: async (): Promise<Msg[]> => {
      const { data, error } = await supabase
        .from("assistant_messages")
        .select("id,role,content,suggestions,created_at")
        .eq("thread_id", activeId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  useEffect(() => {
    if (!activeId && threadsQ.data && threadsQ.data.length > 0) {
      setActiveId(threadsQ.data[0].id);
    }
  }, [threadsQ.data, activeId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgsQ.data, sending]);

  useEffect(() => { inputRef.current?.focus(); }, [activeId]);

  const messages = msgsQ.data ?? [];
  const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
  const suggestions = (lastAssistant?.suggestions && lastAssistant.suggestions.length > 0)
    ? lastAssistant.suggestions
    : (messages.length === 0 ? STARTER_SUGGESTIONS : []);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setInput("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-assistant", {
        body: { threadId: activeId, message },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const newThreadId = (data as any).threadId as string;
      if (newThreadId !== activeId) setActiveId(newThreadId);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["assistant-messages", newThreadId] }),
        qc.invalidateQueries({ queryKey: ["assistant-threads"] }),
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to get response");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function newChat() {
    setActiveId(null);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function deleteThread(id: string) {
    if (!confirm("Delete this conversation?")) return;
    const { error } = await supabase.from("assistant_threads").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (activeId === id) setActiveId(null);
    qc.invalidateQueries({ queryKey: ["assistant-threads"] });
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Edo Attendance AI Assistant"
        subtitle="Ask anything about schools, attendance, teachers, pupils, flagged records & audit logs."
        icon={Bot}
      />

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Sidebar */}
        <div className="rounded-lg border bg-card flex flex-col">
          <div className="p-3 border-b">
            <Button onClick={newChat} className="w-full" size="sm">
              <Plus className="h-4 w-4 mr-1" /> New chat
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {threadsQ.data?.map(t => (
                <div
                  key={t.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted",
                    activeId === t.id && "bg-muted"
                  )}
                  onClick={() => setActiveId(t.id)}
                >
                  <span className="truncate flex-1">{t.title}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {threadsQ.data?.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-3">No conversations yet.</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat panel */}
        <div className="rounded-lg border bg-card flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !sending && (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                <div className="h-14 w-14 rounded-full bg-primary/10 grid place-items-center mb-3">
                  <Bot className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Edo Attendance AI Assistant</h2>
                <p className="text-sm mt-1 max-w-md">
                  I can pull live data from across the admin dashboard. Try one of these:
                </p>
              </div>
            )}

            {messages.map(m => (
              <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 grid place-items-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-2 prose-ul:my-2 prose-table:my-2">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-muted grid place-items-center">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 grid place-items-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && !sending && (
            <div className="px-4 pt-2 border-t bg-muted/30">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <Sparkles className="h-3 w-3" /> Suggested questions
              </div>
              <div className="flex flex-wrap gap-2 pb-3">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t p-3 flex gap-2 items-end bg-background"
          >
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about attendance, schools, teachers, flagged records…"
              rows={1}
              className="resize-none min-h-[40px] max-h-32"
              disabled={sending}
            />
            <Button type="submit" size="icon" disabled={sending || !input.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
