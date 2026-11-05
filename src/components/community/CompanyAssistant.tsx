import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUpRight, BookOpen, Building2, Check, ChevronRight, ExternalLink, Library, LoaderCircle, Mail, MessageSquareText, Pencil, Phone, Plus, Send, ShieldCheck, Sparkles, Trash2, UserRound, UsersRound, X } from "lucide-react";
import { trpc, type RouterOutputs } from "@/providers/trpc";
import { Button } from "@/components/ui/button";

type ManualDocument = RouterOutputs["assistant"]["manual"]["documents"][number];
type LibraryView = "manual" | "contacts";

const publicSuggestions = [
  "What does UNITEC USA Design do?",
  "What is the difference between FOB and CIF?",
  "Where are the Miami office and Medellín showroom?",
  "¿Qué productos ofrece la empresa?",
];

export function CompanyAssistant({ isAdmin }: { isAdmin: boolean }) {
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("All");
  const [libraryView, setLibraryView] = useState<LibraryView>("manual");
  const [selectedDocument, setSelectedDocument] = useState<ManualDocument | null>(null);
  const [editingDocument, setEditingDocument] = useState<ManualDocument | null | "new">(null);
  const [manualOpen, setManualOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const history = trpc.assistant.history.useQuery();
  const manual = trpc.assistant.manual.useQuery();
  const ask = trpc.assistant.ask.useMutation({
    onSuccess: async () => {
      setQuestion("");
      await utils.assistant.history.invalidate();
    },
  });
  const clear = trpc.assistant.clear.useMutation({
    onSuccess: async () => { await utils.assistant.history.invalidate(); },
  });
  const remove = trpc.assistant.deleteResource.useMutation({
    onSuccess: async () => {
      setSelectedDocument(null);
      await utils.assistant.manual.invalidate();
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: history.data?.length ? "smooth" : "auto", block: "nearest" });
  }, [history.data?.length, ask.isPending]);

  function submit(value = question) {
    const clean = value.trim();
    if (!clean || ask.isPending) return;
    if (value !== question) setQuestion(clean);
    ask.mutate({ question: clean });
  }

  const allDocuments = manual.data?.documents ?? [];
  const internalDocuments = allDocuments.filter((document) => document.visibility === "private");
  const contacts = internalDocuments.filter((document) => document.kind === "contact");
  const manualDocuments = allDocuments.filter((document) => document.kind !== "contact");
  const categories = ["All", ...new Set(manualDocuments.map((document) => document.category))];
  const documents = manualDocuments.filter((document) => category === "All" || document.category === category);
  const suggestions = [
    ...(contacts.length ? ["Who should I contact about an HR issue?"] : []),
    ...(internalDocuments.some((document) => document.kind === "document") ? ["What internal standards should I follow?"] : []),
    ...publicSuggestions,
  ].slice(0, 4);

  function openSource(source: { id: string }) {
    const document = allDocuments.find((item) => item.id === source.id);
    if (document) setSelectedDocument(document);
  }

  return <div className="assistant-view">
    <section className="assistant-workspace">
      <header className="assistant-header">
        <div><span className="eyebrow"><Sparkles /> COMPANY & HR, TOGETHER</span><h1>Ask the manual.</h1><p>Company answers, standards and the right people—one trusted place.</p></div>
        <div className="assistant-header-actions">
          {Boolean(history.data?.length) && <button className="clear-chat" onClick={() => clear.mutate()} disabled={clear.isPending}><Trash2 /> Clear</button>}
          <button className="manual-mobile-button" onClick={() => setManualOpen((open) => !open)}><Library /> Company hub</button>
        </div>
      </header>

      <div className="assistant-scope"><ShieldCheck /><span><strong>Public website guidance + admin-published internal resources.</strong> If a policy, contact or answer has not been published, the assistant will say it doesn’t know.</span></div>

      <div className="assistant-conversation" aria-live="polite">
        {history.isLoading && <div className="assistant-loading"><LoaderCircle className="spin" /> Opening your company conversation…</div>}
        {history.error && <div className="assistant-error"><AlertCircle /><div><strong>We couldn’t load your conversation.</strong><p>{history.error.message}</p><Button variant="outline" onClick={() => void history.refetch()}>Try again</Button></div></div>}

        {!history.isLoading && !history.error && !history.data?.length && <div className="assistant-welcome">
          <div className="assistant-orbit"><Building2 /><span /></div>
          <span className="eyebrow">A GOOD PLACE TO START</span>
          <h2>What would you like to know?</h2>
          <p>Ask in English or Spanish about the company, internal standards, reporting contacts, materials, importing or locations.</p>
          <div className="assistant-suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => submit(suggestion)}><MessageSquareText /><span>{suggestion}</span><ChevronRight /></button>)}</div>
        </div>}

        {history.data?.map((message) => <article key={message.id} className={`assistant-message ${message.role}`}>
          <div className="message-label">{message.role === "assistant" ? <><Sparkles /> Manual assistant</> : "You"}</div>
          <div className="message-bubble">{message.body}</div>
          {message.role === "assistant" && message.sources.length > 0 && <div className="message-sources"><span><Check /> Grounded in {message.sources.length} company {message.sources.length === 1 ? "source" : "sources"}</span>{message.sources.map((source) => source.url ? <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><BookOpen />{source.title}<ExternalLink /></a> : <button key={source.id} onClick={() => openSource(source)}><ShieldCheck />{source.title}<ArrowUpRight /></button>)}</div>}
        </article>)}

        {ask.isPending && <div className="assistant-message assistant pending"><div className="message-label"><Sparkles /> Manual assistant</div><div className="message-bubble thinking"><i /><i /><i /><span>Reading the relevant company sources…</span></div></div>}
        {ask.error && <div className="assistant-error"><AlertCircle /><div><strong>{ask.error.message.includes("quota") ? "The assistant is currently unavailable." : "Your question wasn’t answered."}</strong><p>{ask.error.message}</p><Button variant="outline" onClick={() => submit()} disabled={ask.isPending}>Retry deliberately</Button></div></div>}
        <div ref={endRef} />
      </div>

      <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <label htmlFor="company-question" className="sr-only">Ask a company or HR question</label>
        <textarea id="company-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="Ask about standards, who to contact, the company, products…" rows={2} maxLength={1200} />
        <div className="composer-bottom"><span>Uses public and admin-published sources · AI can make mistakes</span><button type="submit" disabled={!question.trim() || ask.isPending} aria-label="Send company question">{ask.isPending ? <LoaderCircle className="spin" /> : <Send />}</button></div>
      </form>
    </section>

    <aside className={`manual-library ${manualOpen ? "open" : ""}`}>
      <div className="manual-library-heading"><span className="eyebrow"><Library /> YOUR COMPANY HUB</span><h2>Know where to go.</h2><p>Instructions, standards and the people responsible.</p>{isAdmin && <button className="add-resource-button" onClick={() => setEditingDocument("new")}><Plus /> Add internal resource</button>}</div>
      <div className="library-view-tabs"><button className={libraryView === "manual" ? "active" : ""} onClick={() => setLibraryView("manual")}><BookOpen /> Manual <span>{manualDocuments.length}</span></button><button className={libraryView === "contacts" ? "active" : ""} onClick={() => setLibraryView("contacts")}><UsersRound /> Who to contact <span>{contacts.length}</span></button></div>

      {libraryView === "manual" && <>
        <div className="manual-filters" aria-label="Filter manual topics">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <div className="manual-document-list">{documents.map((document) => <article className="manual-document-item" key={document.id}>
          <button className="manual-document-open" onClick={() => setSelectedDocument(document)}><span>{document.visibility === "private" ? "Internal" : "Public"} · {document.category}{document.isPublished === false ? " · Draft" : ""}</span><strong>{document.title}</strong><p>{document.summary}</p><span className="read-manual">Read section <ArrowUpRight /></span></button>
          {isAdmin && document.resourceId && <button className="edit-resource" onClick={() => setEditingDocument(document)} aria-label={`Edit ${document.title}`}><Pencil /></button>}
        </article>)}</div>
      </>}

      {libraryView === "contacts" && <div className="contact-directory">
        {!contacts.length && <div className="contact-empty"><UserRound /><h3>No internal contacts published yet.</h3><p>{isAdmin ? "Add the real person or team, their responsibilities, reporting line and verified contact details." : "An administrator needs to publish the right contact for HR, reporting and escalation questions."}</p>{isAdmin && <button onClick={() => setEditingDocument("new")}><Plus /> Add the first contact</button>}</div>}
        {contacts.map((contact) => <article className="contact-card" key={contact.id}>
          <div className="contact-card-top"><span className="contact-initial">{contact.title.charAt(0)}</span><div><span>{contact.category}{contact.isPublished === false ? " · Draft" : ""}</span><h3>{contact.title}</h3><p>{contact.summary}</p></div>{isAdmin && <button className="edit-resource" onClick={() => setEditingDocument(contact)} aria-label={`Edit ${contact.title}`}><Pencil /></button>}</div>
          <p className="contact-responsibilities">{contact.body}</p>
          {contact.reportsTo && <div className="reporting-line"><strong>Reports / escalates to</strong><span>{contact.reportsTo}</span></div>}
          <div className="contact-actions">{contact.phone && <a href={`tel:${contact.phone}`}><Phone />{contact.phone}</a>}{contact.email && <a href={`mailto:${contact.email}`}><Mail />{contact.email}</a>}</div>
        </article>)}
      </div>}
      <div className="manual-retrieved"><span className="status-dot" />{internalDocuments.length} internal · {allDocuments.length - internalDocuments.length} public resources</div>
    </aside>

    {selectedDocument && <div className="manual-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedDocument(null); }}>
      <section className="manual-modal" role="dialog" aria-modal="true" aria-labelledby="manual-document-title">
        <button className="manual-modal-close" onClick={() => setSelectedDocument(null)} aria-label="Close manual section"><X /></button>
        <span className="eyebrow">{selectedDocument.visibility === "private" ? "INTERNAL · ADMIN PUBLISHED" : "PUBLIC WEBSITE"} · {selectedDocument.category}</span>
        <h2 id="manual-document-title">{selectedDocument.title}</h2>
        <p className="manual-modal-summary">{selectedDocument.summary}</p>
        <div className="manual-full-text">{selectedDocument.content.split("\n").map((paragraph, index) => paragraph.trim() ? <p key={index}>{paragraph}</p> : null)}</div>
        {selectedDocument.url ? <a className="manual-source-link" href={selectedDocument.url} target="_blank" rel="noreferrer">Open the original website page <ExternalLink /></a> : <div className="internal-source-stamp"><ShieldCheck /> Visible only to authenticated employees{selectedDocument.isPublished === false ? " · Draft visible to administrators" : ""}</div>}
        {isAdmin && selectedDocument.resourceId && <div className="resource-modal-actions"><Button variant="outline" onClick={() => { setEditingDocument(selectedDocument); setSelectedDocument(null); }}><Pencil /> Edit</Button><Button variant="outline" disabled={remove.isPending} onClick={() => { if (window.confirm("Delete this internal resource? This cannot be undone.")) remove.mutate({ id: selectedDocument.resourceId! }); }}><Trash2 /> Delete</Button></div>}
      </section>
    </div>}

    {editingDocument && <ResourceEditor document={editingDocument === "new" ? null : editingDocument} defaultKind={libraryView === "contacts" ? "contact" : "document"} onClose={() => setEditingDocument(null)} onSaved={async () => { setEditingDocument(null); await utils.assistant.manual.invalidate(); }} />}
  </div>;
}

function ResourceEditor({ document, defaultKind, onClose, onSaved }: { document: ManualDocument | null; defaultKind: "document" | "contact"; onClose: () => void; onSaved: () => Promise<void> }) {
  const [kind, setKind] = useState<"document" | "contact">(document?.kind ?? defaultKind);
  const [title, setTitle] = useState(document?.title ?? "");
  const [category, setCategory] = useState(document?.category ?? (defaultKind === "contact" ? "HR" : "Standards"));
  const [summary, setSummary] = useState(document?.summary ?? "");
  const [body, setBody] = useState(document?.body ?? "");
  const [phone, setPhone] = useState(document?.phone ?? "");
  const [email, setEmail] = useState(document?.email ?? "");
  const [reportsTo, setReportsTo] = useState(document?.reportsTo ?? "");
  const [isPublished, setIsPublished] = useState(document?.isPublished ?? true);
  const save = trpc.assistant.saveResource.useMutation({ onSuccess: onSaved });

  return <div className="manual-modal-backdrop resource-editor-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="resource-editor" onSubmit={(event) => { event.preventDefault(); save.mutate({ id: document?.resourceId, kind, title, category, summary, body, phone, email, reportsTo, isPublished }); }}>
      <button type="button" className="manual-modal-close" onClick={onClose} aria-label="Close resource editor"><X /></button>
      <span className="eyebrow">ADMIN · INTERNAL KNOWLEDGE</span>
      <h2>{document ? "Edit resource" : "Add a trusted resource"}</h2>
      <p>Publish only verified company information. Employees and the assistant will use exactly what you enter.</p>
      <div className="resource-form-grid">
        <label>Resource type<select value={kind} onChange={(event) => setKind(event.target.value as "document" | "contact")}><option value="document">Policy / standard / instruction</option><option value="contact">Contact / reporting responsibility</option></select></label>
        <label>Category<input value={category} onChange={(event) => setCategory(event.target.value)} list="resource-categories" required maxLength={80} /><datalist id="resource-categories"><option value="HR policies" /><option value="Standards" /><option value="Reporting" /><option value="Onboarding" /><option value="Safety" /><option value="HR" /><option value="Management" /><option value="IT support" /></datalist></label>
        <label className="full">{kind === "contact" ? "Name or team" : "Document title"}<input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={180} /></label>
        <label className="full">{kind === "contact" ? "Role / department" : "Short summary"}<input value={summary} onChange={(event) => setSummary(event.target.value)} required minLength={2} maxLength={500} /></label>
        <label className="full">{kind === "contact" ? "Responsibilities and when to contact them" : "Full instructions or policy"}<textarea value={body} onChange={(event) => setBody(event.target.value)} required minLength={2} maxLength={20000} rows={8} /></label>
        {kind === "contact" && <><label>Phone / WhatsApp<input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={60} /></label><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={320} /></label><label className="full">Reports to / escalation path<input value={reportsTo} onChange={(event) => setReportsTo(event.target.value)} maxLength={180} placeholder="Only enter a verified reporting line" /></label></>}
      </div>
      <label className="publish-resource"><input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} /><span><strong>Publish to employees</strong><small>Turn off to keep this as an administrator-only draft.</small></span></label>
      {save.error && <div className="resource-save-error">{save.error.message}</div>}
      <div className="resource-editor-actions"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? <LoaderCircle className="spin" /> : <Check />} {isPublished ? "Publish resource" : "Save draft"}</Button></div>
    </form>
  </div>;
}
