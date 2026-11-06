import { useMemo, useState } from "react";
import { MapPin, MessageCircle, Search, ShieldOff, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { trpc, type CommunityUser, type Person } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PersonAvatar } from "./PersonAvatar";

export function People({ currentUser, onMessage }: { currentUser: CommunityUser; onMessage: (person: Person) => void }) {
  const [search, setSearch] = useState("");
  const [interest, setInterest] = useState("Todos los intereses");
  const [selected, setSelected] = useState<Person | null>(null);
  const people = trpc.community.people.useQuery();
  const utils = trpc.useUtils();
  const isUserAdmin = currentUser.role === "admin";
  const adminUsers = trpc.admin.listUsers.useQuery(undefined, {
    enabled: isUserAdmin,
    refetchInterval: 15000,
  });
  const setDisabled = trpc.admin.setUserDisabled.useMutation({
    onSuccess: async ({ disabledAt }) => {
      toast.success(disabledAt ? "Cuenta desactivada" : "Cuenta reactivada");
      await Promise.all([utils.admin.listUsers.invalidate(), utils.community.people.invalidate()]);
    },
    onError: (error) => toast.error(error.message),
  });
  const disabledIds = useMemo(
    () => new Set((adminUsers.data ?? []).filter((u) => u.disabledAt).map((u) => u.id)),
    [adminUsers.data],
  );

  function toggleAccount(userId: number, name: string | null, disabling: boolean) {
    const message = disabling
      ? `¿Desactivar la cuenta de ${name ?? "este usuario"}? No podrá iniciar sesión y desaparecerá del directorio.`
      : `¿Reactivar la cuenta de ${name ?? "este usuario"}?`;
    if (window.confirm(message)) setDisabled.mutate({ userId, disabled: disabling });
  }
  const interests = useMemo(() => ["Todos los intereses", ...new Set(people.data?.flatMap((person) => person.interests) ?? [])].sort((a, b) => a === "Todos los intereses" ? -1 : b === "Todos los intereses" ? 1 : a.localeCompare(b)), [people.data]);
  const filtered = people.data?.filter((person) => {
    const query = search.toLowerCase();
    const matchesSearch = !query || [person.name, person.jobTitle, person.department, person.location, person.bio, ...person.interests].some((value) => value?.toLowerCase().includes(query));
    return matchesSearch && (interest === "Todos los intereses" || person.interests.includes(interest));
  }) ?? [];

  return (
    <div className="people-view">
      <section className="page-intro">
        <p className="meta-label">ENCUENTRA A TU GENTE</p>
        <h1>Somos mucho más que nuestros cargos.</h1>
        <p>Descubre intereses comunes, conoce la historia de tus colegas o inicia una conversación.</p>
      </section>
      <div className="people-tools">
        <label className="search-field"><Search /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Busca nombres, cargos, lugares o intereses" />{search && <button onClick={() => setSearch("")} aria-label="Limpiar búsqueda"><X /></button>}</label>
        <select value={interest} onChange={(event) => setInterest(event.target.value)} aria-label="Filtrar por interés">{interests.map((item) => <option key={item}>{item}</option>)}</select>
      </div>
      <p className="results-count">{filtered.length} {filtered.length === 1 ? "persona" : "personas"}</p>
      {people.isLoading ? <div className="people-grid">{[1, 2, 3].map((item) => <div className="person-skeleton" key={item} />)}</div> : <div className="people-grid">
        {filtered.map((person) => <article className="person-card" key={person.id}>
          <button className="person-main" onClick={() => setSelected(person)}>
            <PersonAvatar person={person} size="lg" />
            <div className="person-heading"><h2>{person.name}</h2>{person.isDemo && <span className="sample-tag">EJEMPLO</span>}</div>
            <p className="person-role">{person.jobTitle || "Colega"}{person.department ? ` · ${person.department}` : ""}</p>
            {person.location && <p className="person-location"><MapPin />{person.location}</p>}
            <p className="person-bio">{person.bio || "Este colega todavía está escribiendo su historia."}</p>
            <div className="interest-list">{person.interests.slice(0, 3).map((item) => <span key={item}>{item}</span>)}</div>
          </button>
          {person.id !== currentUser.id && !person.isDemo && <Button variant="outline" onClick={() => onMessage(person)}><MessageCircle />Mensaje</Button>}
          {person.id === currentUser.id && <span className="self-label">Este eres tú</span>}
          {isUserAdmin && person.id !== currentUser.id && !person.isDemo && (
            <Button
              variant="ghost"
              className={disabledIds.has(person.id) ? "admin-toggle" : ""}
              onClick={() => toggleAccount(person.id, person.name, !disabledIds.has(person.id))}
              disabled={setDisabled.isPending}
              aria-label={disabledIds.has(person.id) ? "Reactivar cuenta" : "Desactivar cuenta"}
              title={disabledIds.has(person.id) ? "Reactivar cuenta (admin)" : "Desactivar cuenta (admin)"}
            >
              {disabledIds.has(person.id) ? <ShieldCheck /> : <ShieldOff />}
              {disabledIds.has(person.id) ? "Reactivar" : "Desactivar"}
            </Button>
          )}
        </article>)}
      </div>}
      {!people.isLoading && !filtered.length && <div className="empty-state"><Search /><h2>No encontramos coincidencias.</h2><p>Prueba con otro nombre o amplía el filtro de intereses.</p><Button variant="outline" onClick={() => { setSearch(""); setInterest("Todos los intereses"); }}>Limpiar filtros</Button></div>}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="profile-dialog">
          {selected && <>
            <DialogHeader><PersonAvatar person={selected} size="xl" /><DialogTitle>{selected.name}</DialogTitle><DialogDescription>{selected.jobTitle || "Colega"}{selected.department ? ` · ${selected.department}` : ""}</DialogDescription></DialogHeader>
            {selected.location && <p className="person-location"><MapPin />{selected.location}</p>}
            <p className="profile-bio">{selected.bio || "Aún no hay biografía."}</p>
            <div><p className="meta-label">FUERA DEL TRABAJO</p><div className="interest-list">{selected.interests.map((item) => <span key={item}>{item}</span>)}</div></div>
            {selected.id !== currentUser.id && !selected.isDemo && <Button onClick={() => { onMessage(selected); setSelected(null); }}><MessageCircle />Iniciar conversación</Button>}
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
