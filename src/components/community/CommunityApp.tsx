import { useState } from "react";
import { Cake, Compass, Home as HomeIcon, LogOut, MessageCircle, Settings2, ShieldCheck, Users } from "lucide-react";
import { trpc, type Person } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Feed } from "./Feed";
import { People } from "./People";
import { Messages } from "./Messages";
import { Celebrations, CelebrationsRail, useCelebrations } from "./Celebrations";
import { ProfileEditor } from "./ProfileEditor";
import { PersonAvatar } from "./PersonAvatar";

type Tab = "feed" | "people" | "messages" | "celebrations";

const navItems = [
  { id: "feed" as const, label: "Community", icon: HomeIcon },
  { id: "people" as const, label: "People", icon: Users },
  { id: "messages" as const, label: "Messages", icon: MessageCircle },
  { id: "celebrations" as const, label: "Celebrations", icon: Cake },
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

  if (me.isLoading) return <div className="app-loading"><Brand /><div className="loading-mark" /><p>Opening your community…</p></div>;
  if (me.error || !me.data) return <div className="app-loading"><Brand /><h1>We couldn’t open your profile.</h1><p>{me.error?.message}</p><Button onClick={() => void me.refetch()}>Try again</Button></div>;
  const user = me.data;

  return <div className="community-shell">
    <aside className="desktop-sidebar">
      <Brand />
      <nav aria-label="Main navigation">{navItems.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><item.icon /><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-bottom">
        <button className="sidebar-profile" onClick={() => setProfileOpen(true)}><PersonAvatar person={{ ...user, name: user.name ?? "You" }} /><span><strong>{user.name}</strong><small>{user.jobTitle || "Complete your profile"}</small></span><Settings2 /></button>
        <button className="logout-button" onClick={onLogout}><LogOut />Sign out</button>
      </div>
    </aside>

    <header className="mobile-header"><Brand /><button onClick={() => setProfileOpen(true)} aria-label="Edit your profile"><PersonAvatar person={{ ...user, name: user.name ?? "You" }} size="sm" /></button></header>

    <main className={`community-main main-${tab}`}>
      {tab === "feed" && <div className="feed-layout"><Feed currentUser={user} /><aside className="right-rail"><CelebrationsRail events={events} currentUser={user} /><CommunityPrinciples /></aside></div>}
      {tab === "people" && <People currentUser={user} onMessage={messagePerson} />}
      {tab === "messages" && <Messages currentUser={user} activeConversation={activeConversation} setActiveConversation={setActiveConversation} onFindPeople={() => setTab("people")} />}
      {tab === "celebrations" && <Celebrations events={events} currentUser={user} />}
    </main>

    <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><item.icon /><span>{item.label === "Community" ? "Home" : item.label}</span></button>)}</nav>
    {profileOpen && <ProfileEditor open={profileOpen} onOpenChange={setProfileOpen} user={user} />}
  </div>;
}

function Brand() {
  return <div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>Common<br />Ground</span></div>;
}

function CommunityPrinciples() {
  return <section className="community-principles"><Compass /><h2>A little more human.</h2><p>No performance scores. No popularity contests. Just a place to be curious about each other.</p><div className="privacy-note"><ShieldCheck /><span><strong>Your conversation, not a dashboard.</strong> Direct messages have no manager view. Service administrators may still access data when required.</span></div></section>;
}
