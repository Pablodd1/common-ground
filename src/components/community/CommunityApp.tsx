import { useState } from "react";
import { BookOpen, Cake, Compass, Home as HomeIcon, LogOut, MessageCircle, Settings2, ShieldCheck, Users } from "lucide-react";
import { trpc, type Person } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Feed } from "./Feed";
import { People } from "./People";
import { Messages } from "./Messages";
import { Celebrations, CelebrationsRail, useCelebrations } from "./Celebrations";
import { ProfileEditor } from "./ProfileEditor";
import { PersonAvatar } from "./PersonAvatar";
import { CompanyAssistant } from "./CompanyAssistant";
import { NotificationsBell } from "./NotificationsBell";

type Tab = "feed" | "people" | "messages" | "assistant" | "celebrations";

const navItems = [
  { id: "feed" as const, label: "Comunidad", icon: HomeIcon },
  { id: "people" as const, label: "Personas", icon: Users },
  { id: "messages" as const, label: "Mensajes", icon: MessageCircle },
  { id: "assistant" as const, label: "Empresa", icon: BookOpen },
  { id: "celebrations" as const, label: "Celebraciones", icon: Cake },
];

export function CommunityApp({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("feed");
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const me = trpc.community.me.useQuery();
  const people = trpc.community.people.useQuery();
  const utils = trpc.useUtils();
  const openConversation = trpc.community.openConversation.useMutation({
    onSuccess: ({ id }) => { setActiveConversation(id); setTab("messages"); void utils.community.conversations.invalidate(); },
  });
  const events = useCelebrations(people.data);

  function messagePerson(person: Person) {
    openConversation.mutate({ personId: person.id });
  }

  if (me.isLoading) return <div className="app-loading"><Brand /><div className="loading-mark" /><p>Abriendo tu comunidad…</p></div>;
  if (me.error || !me.data) return <div className="app-loading"><Brand /><h1>No pudimos abrir tu perfil.</h1><p>{me.error?.message}</p><Button onClick={() => void me.refetch()}>Intentar de nuevo</Button></div>;
  const user = me.data;

  return <div className="community-shell">
    <aside className="desktop-sidebar">
      <div className="sidebar-top"><Brand /><NotificationsBell onNavigate={(target) => setTab(target)} /></div>
      <nav aria-label="Navegación principal">{navItems.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><item.icon /><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-bottom">
        <button className="sidebar-profile" onClick={() => setProfileOpen(true)}><PersonAvatar person={{ ...user, name: user.name ?? "Tú" }} /><span><strong>{user.name}</strong><small>{user.jobTitle || "Completa tu perfil"}</small></span><Settings2 /></button>
        <button className="logout-button" onClick={onLogout}><LogOut />Cerrar sesión</button>
      </div>
    </aside>

    <header className="mobile-header"><Brand /><NotificationsBell onNavigate={(target) => setTab(target)} /><button onClick={() => setProfileOpen(true)} aria-label="Editar tu perfil"><PersonAvatar person={{ ...user, name: user.name ?? "Tú" }} size="sm" /></button></header>

    <main className={`community-main main-${tab}`}>
      {tab === "feed" && <div className="feed-layout"><Feed currentUser={user} /><aside className="right-rail"><CelebrationsRail events={events} currentUser={user} /><CommunityPrinciples /></aside></div>}
      {tab === "people" && <People currentUser={user} onMessage={messagePerson} />}
      {tab === "messages" && <Messages currentUser={user} activeConversation={activeConversation} setActiveConversation={setActiveConversation} onFindPeople={() => setTab("people")} />}
      {tab === "assistant" && <CompanyAssistant isAdmin={user.role === "admin"} />}
      {tab === "celebrations" && <Celebrations events={events} currentUser={user} />}
    </main>

    <nav className="mobile-nav" aria-label="Navegación móvil">{navItems.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><item.icon /><span>{item.label === "Comunidad" ? "Inicio" : item.label}</span></button>)}</nav>
    {profileOpen && <ProfileEditor open={profileOpen} onOpenChange={setProfileOpen} user={user} />}
  </div>;
}

function Brand() {
  return <div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>Unitec<br />Familia</span></div>;
}

function CommunityPrinciples() {
  return <section className="community-principles"><Compass /><h2>Un espacio más humano.</h2><p>Sin puntajes de desempeño ni concursos de popularidad. Un lugar para conocernos mejor.</p><div className="privacy-note"><ShieldCheck /><span><strong>Tu conversación, no un tablero de control.</strong> Los mensajes directos no tienen vista para jefes. Los administradores del servicio pueden acceder a los datos cuando sea necesario.</span></div></section>;
}
