import { useMemo, useState } from "react";
import { MapPin, MessageCircle, Search, X } from "lucide-react";
import { trpc, type CommunityUser, type Person } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PersonAvatar } from "./PersonAvatar";

export function People({ currentUser, onMessage }: { currentUser: CommunityUser; onMessage: (person: Person) => void }) {
  const [search, setSearch] = useState("");
  const [interest, setInterest] = useState("All interests");
  const [selected, setSelected] = useState<Person | null>(null);
  const people = trpc.community.people.useQuery();
  const interests = useMemo(() => ["All interests", ...new Set(people.data?.flatMap((person) => person.interests) ?? [])].sort((a, b) => a === "All interests" ? -1 : b === "All interests" ? 1 : a.localeCompare(b)), [people.data]);
  const filtered = people.data?.filter((person) => {
    const query = search.toLowerCase();
    const matchesSearch = !query || [person.name, person.jobTitle, person.department, person.location, person.bio, ...person.interests].some((value) => value?.toLowerCase().includes(query));
    return matchesSearch && (interest === "All interests" || person.interests.includes(interest));
  }) ?? [];

  return (
    <div className="people-view">
      <section className="page-intro">
        <p className="meta-label">FIND YOUR PEOPLE</p>
        <h1>There’s more to us than our job titles.</h1>
        <p>Discover shared interests, learn someone’s story, or start a one-to-one conversation.</p>
      </section>
      <div className="people-tools">
        <label className="search-field"><Search /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search names, roles, places, or interests" />{search && <button onClick={() => setSearch("")} aria-label="Clear search"><X /></button>}</label>
        <select value={interest} onChange={(event) => setInterest(event.target.value)} aria-label="Filter by interest">{interests.map((item) => <option key={item}>{item}</option>)}</select>
      </div>
      <p className="results-count">{filtered.length} {filtered.length === 1 ? "person" : "people"}</p>
      {people.isLoading ? <div className="people-grid">{[1, 2, 3].map((item) => <div className="person-skeleton" key={item} />)}</div> : <div className="people-grid">
        {filtered.map((person) => <article className="person-card" key={person.id}>
          <button className="person-main" onClick={() => setSelected(person)}>
            <PersonAvatar person={person} size="lg" />
            <div className="person-heading"><h2>{person.name}</h2>{person.isDemo && <span className="sample-tag">SAMPLE</span>}</div>
            <p className="person-role">{person.jobTitle || "Colleague"}{person.department ? ` · ${person.department}` : ""}</p>
            {person.location && <p className="person-location"><MapPin />{person.location}</p>}
            <p className="person-bio">{person.bio || "This colleague is still writing their story."}</p>
            <div className="interest-list">{person.interests.slice(0, 3).map((item) => <span key={item}>{item}</span>)}</div>
          </button>
          {person.id !== currentUser.id && !person.isDemo && <Button variant="outline" onClick={() => onMessage(person)}><MessageCircle />Message</Button>}
          {person.id === currentUser.id && <span className="self-label">This is you</span>}
        </article>)}
      </div>}
      {!people.isLoading && !filtered.length && <div className="empty-state"><Search /><h2>No matches yet.</h2><p>Try another name or widen your interest filter.</p><Button variant="outline" onClick={() => { setSearch(""); setInterest("All interests"); }}>Clear filters</Button></div>}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="profile-dialog">
          {selected && <>
            <DialogHeader><PersonAvatar person={selected} size="xl" /><DialogTitle>{selected.name}</DialogTitle><DialogDescription>{selected.jobTitle || "Colleague"}{selected.department ? ` · ${selected.department}` : ""}</DialogDescription></DialogHeader>
            {selected.location && <p className="person-location"><MapPin />{selected.location}</p>}
            <p className="profile-bio">{selected.bio || "No bio yet."}</p>
            <div><p className="meta-label">OUTSIDE WORK</p><div className="interest-list">{selected.interests.map((item) => <span key={item}>{item}</span>)}</div></div>
            {selected.id !== currentUser.id && !selected.isDemo && <Button onClick={() => { onMessage(selected); setSelected(null); }}><MessageCircle />Start a conversation</Button>}
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
