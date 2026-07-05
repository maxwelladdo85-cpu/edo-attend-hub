import { useEffect, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

type Notif = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications" as any)
      .select("id,title,body,type,link,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as Notif[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    void load();
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unread = items.filter((n) => !n.read_at).length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications" as any)
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    void load();
  };

  const markOne = async (id: string) => {
    await supabase
      .from("notifications" as any)
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    void load();
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="font-semibold text-sm">Notifications</div>
          {unread > 0 && (
            <Button size="sm" variant="ghost" onClick={markAllRead} className="h-7 text-xs">
              <Check className="h-3.5 w-3.5 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-border">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">
              <Loader2 className="h-4 w-4 inline animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.read_at) void markOne(n.id);
                  setOpen(false);
                }}
                className={`w-full text-left p-3 hover:bg-muted transition-colors ${
                  !n.read_at ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read_at && (
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">{n.title}</div>
                    {n.body && (
                      <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
