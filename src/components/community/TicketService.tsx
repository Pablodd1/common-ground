// Internal support tickets: the admin inbox and the "my tickets" list that
// live in the Empresa tab. Created with /ticket (or #ticket) in the composer.
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, LifeBuoy, Ticket } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";

export function TicketService({ isAdmin }: { isAdmin: boolean }) {
  return (
    <section className="ticket-service">
      <header>
        <LifeBuoy />
        <div>
          <h2>Soporte interno</h2>
          <p>Escribe <code>/ticket</code> (o <code>#ticket</code>) en el cuadro de publicaciones para reportar un problema: llega al administrador al instante con aviso por Telegram y correo.</p>
        </div>
      </header>
      {isAdmin ? <AdminInbox /> : <MyTickets />}
    </section>
  );
}

function AdminInbox() {
  const utils = trpc.useUtils();
  const list = trpc.tickets.list.useQuery(undefined, { refetchInterval: 30_000 });
  const resolve = trpc.tickets.resolve.useMutation({
    onSuccess: async () => {
      toast.success("Ticket marcado como resuelto");
      await Promise.all([utils.tickets.list.invalidate(), utils.notifications.list.invalidate()]);
    },
    onError: (error) => toast.error(error.message),
  });
  const open = (list.data ?? []).filter((t) => t.status === "open");
  const done = (list.data ?? []).filter((t) => t.status === "resolved").slice(0, 5);

  if (list.isLoading) return <p className="ticket-empty">Cargando tickets…</p>;
  return (
    <div className="ticket-lists">
      <div>
        <h3>Abiertos ({open.length})</h3>
        {!open.length && <p className="ticket-empty">Sin tickets abiertos. 🎉</p>}
        <ul>
          {open.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket}>
              <Button size="sm" variant="outline" onClick={() => resolve.mutate({ ticketId: ticket.id })} disabled={resolve.isPending}>
                <CheckCircle2 />Resolver
              </Button>
            </TicketRow>
          ))}
        </ul>
      </div>
      {!!done.length && (
        <div>
          <h3>Resueltos recientemente</h3>
          <ul>
            {done.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} resolved />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MyTickets() {
  const mine = trpc.tickets.mine.useQuery(undefined, { refetchInterval: 60_000 });
  const [expanded, setExpanded] = useState<number | null>(null);
  if (mine.isLoading) return null;
  const items = mine.data ?? [];
  return (
    <div>
      <h3>Mis tickets ({items.length})</h3>
      {!items.length && <p className="ticket-empty">Aún no has reportado nada. Usa <code>/ticket</code> en el cuadro de publicaciones cuando necesites ayuda.</p>}
      <ul>
        {items.map((ticket) => (
          <TicketRow
            key={ticket.id}
            ticket={ticket}
            resolved={ticket.status === "resolved"}
            expanded={expanded === ticket.id}
            onToggle={() => setExpanded(expanded === ticket.id ? null : ticket.id)}
          />
        ))}
      </ul>
    </div>
  );
}

type TicketRowProps = {
  ticket: {
    id: number;
    subject: string;
    body: string;
    status: string;
    createdAt: Date;
    resolvedAt: Date | null;
    creatorName?: string | null;
  };
  resolved?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
};

function TicketRow({ ticket, resolved, expanded, onToggle, children }: TicketRowProps) {
  return (
    <li className={resolved ? "resolved" : ""}>
      <div className="ticket-row">
        <button className="ticket-main" onClick={onToggle} aria-expanded={expanded}>
          <Ticket />
          <span>
            <strong>#{ticket.id} {ticket.subject}</strong>
            <small>
              {ticket.creatorName ? `${ticket.creatorName} · ` : ""}
              {formatDistanceToNow(ticket.createdAt, { addSuffix: true, locale: es })}
              {resolved ? " · resuelto" : ""}
            </small>
          </span>
        </button>
        {children}
      </div>
      {expanded && <p className="ticket-body">{ticket.body}</p>}
    </li>
  );
}
