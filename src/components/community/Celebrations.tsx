import { useMemo } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { Cake, ChevronRight, PartyPopper, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc, type CommunityUser, type Person } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "./PersonAvatar";

export type Celebration = { person: Person; kind: "birthday" | "anniversary"; date: Date; days: number; years?: number };

function nextDate(monthDay: string) {
  const now = new Date();
  const [month, day] = monthDay.split("-").map(Number);
  let date = new Date(now.getFullYear(), month - 1, day);
  if (date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) date = new Date(now.getFullYear() + 1, month - 1, day);
  return date;
}

export function useCelebrations(people?: Person[]) {
  return useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const events: Celebration[] = [];
    people?.forEach((person) => {
      if (person.birthday) {
        const date = nextDate(person.birthday);
        events.push({ person, kind: "birthday", date, days: differenceInCalendarDays(date, today) });
      }
      if (person.startDate) {
        const date = nextDate(person.startDate.slice(5));
        const years = date.getFullYear() - Number(person.startDate.slice(0, 4));
        if (years > 0) events.push({ person, kind: "anniversary", date, days: differenceInCalendarDays(date, today), years });
      }
    });
    return events.sort((a, b) => a.days - b.days);
  }, [people]);
}

export function CelebrationsRail({ events, currentUser }: { events: Celebration[]; currentUser: CommunityUser }) {
  return <section className="celebrations-rail">
    <div className="rail-heading"><PartyPopper /><h2>Motivos para celebrar</h2></div>
    {events.slice(0, 3).map((event) => <CelebrationRow key={`${event.kind}-${event.person.id}`} event={event} currentUser={currentUser} compact />)}
    {!events.length && <p className="muted-copy">Agrega los cumpleaños y las fechas de ingreso a los perfiles para ver las próximas celebraciones.</p>}
  </section>;
}

export function Celebrations({ events, currentUser }: { events: Celebration[]; currentUser: CommunityUser }) {
  return <div className="celebrations-view">
    <section className="page-intro"><p className="meta-label">LOS DÍAS ESPECIALES</p><h1>Días grandes. Saludos sinceros. Conexiones reales.</h1><p>Los cumpleaños y aniversarios laborales son una oportunidad para reconocernos. Agrega tus fechas en el perfil y únete a la celebración.</p></section>
    <div className="celebration-timeline">
      {events.map((event) => <CelebrationRow key={`${event.kind}-${event.person.id}`} event={event} currentUser={currentUser} />)}
      {!events.length && <div className="empty-state"><Cake /><h2>Aún no hay fechas para celebrar.</h2><p>Cuando tus compañeros agreguen su cumpleaños o fecha de ingreso, las próximas celebraciones aparecerán aquí.</p></div>}
    </div>
  </div>;
}

function CelebrationRow({ event, currentUser, compact = false }: { event: Celebration; currentUser: CommunityUser; compact?: boolean }) {
  const utils = trpc.useUtils();
  const celebrate = trpc.community.celebrate.useMutation({
    onSuccess: () => { toast.success("Celebración publicada en la comunidad"); void utils.community.feed.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const when = event.days === 0 ? "Hoy" : event.days === 1 ? "Mañana" : format(event.date, "d 'de' MMM", { locale: es });
  return <article className={`celebration-row ${compact ? "compact" : ""}`}>
    <PersonAvatar person={event.person} size={compact ? "sm" : "md"} />
    <div className="celebration-copy"><strong>{event.person.name}</strong><p>{event.kind === "birthday" ? "Cumpleaños" : `${event.years} ${event.years === 1 ? "año" : "años"} en el equipo`} · {when}</p></div>
    {!compact && <div className="celebration-date"><span>{format(event.date, "MMM", { locale: es })}</span><strong>{format(event.date, "d")}</strong></div>}
    {event.person.id !== currentUser.id && <Button variant={compact ? "ghost" : "outline"} size={compact ? "icon" : "sm"} onClick={() => celebrate.mutate({ personId: event.person.id, kind: event.kind })} disabled={celebrate.isPending}>{compact ? <ChevronRight /> : <Sparkles />}<span className={compact ? "sr-only" : ""}>{compact ? `Celebrar a ${event.person.name}` : "Celebrar"}</span></Button>}
  </article>;
}
