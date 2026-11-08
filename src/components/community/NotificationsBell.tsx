import { useState } from "react";
import { Bell, BellRing, CheckCheck, Ticket, AtSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";

export function NotificationsBell({ onNavigate }: { onNavigate: (tab: "feed" | "assistant") => void }) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data } = trpc.notifications.list.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const markAll = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => void utils.notifications.list.invalidate(),
  });
  const unread = data?.unread ?? 0;

  return (
    <div className="bell-wrap">
      <button
        className="bell-button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread > 0 ? `Avisos: ${unread} sin leer` : "Avisos"}
        aria-expanded={open}
      >
        {unread > 0 ? <BellRing /> : <Bell />}
        {unread > 0 && <span className="bell-badge" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="bell-panel" role="dialog" aria-label="Avisos">
          <header>
            <strong>Avisos</strong>
            {unread > 0 && (
              <Button variant="ghost" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
                <CheckCheck />Marcar leídos
              </Button>
            )}
          </header>
          {!data?.items.length && <p className="bell-empty">Todo tranquilo por aquí.</p>}
          <ul>
            {(data?.items ?? []).map((item) => (
              <li key={item.id} className={item.readAt ? "" : "unread"}>
                <button
                  onClick={() => {
                    void utils.notifications.list.invalidate();
                    onNavigate(item.target === "empresa" ? "assistant" : "feed");
                    setOpen(false);
                  }}
                >
                  <span className="bell-icon">{item.kind === "ticket" ? <Ticket /> : <AtSign />}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.body}</small>
                    <small className="bell-time">{formatDistanceToNow(item.createdAt, { addSuffix: true, locale: es })}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
