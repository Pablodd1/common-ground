import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUpRight, BookOpen, Building2, Check, ChevronRight, ExternalLink, Library, LoaderCircle, MessageSquareText, Send, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { trpc, type RouterOutputs } from "@/providers/trpc";
import { Button } from "@/components/ui/button";

type ManualDocument = RouterOutputs["assistant"]["manual"]["documents"][number];

const suggestions = [
  "What does UNITEC USA Design do?",
  "What is the difference between FOB and CIF?",
  "Where are the Miami office and Medellín showroom?",
  "¿Qué productos ofrece la empresa?",
];

const categories = ["All", "Company", "Products", "Buying & logistics", "Policies", "Contact"] as const;

export function CompanyAssistant() {
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [selectedDocument, setSelectedDocument] = useState<ManualDocument | null>(null);
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: history.data?.length ? "smooth" : "auto", block: "nearest" });
  }, [history.data?.length, ask.isPending]);

  function submit(value = question) {
    const clean = value.trim();
    if (!clean || ask.isPending) return;
    if (value !== question) setQuestion(clean);
    ask.mutate({ question: clean });
  }

  const documents = manual.data?.documents.filter((document) => category === "All" || document.category === category) ?? [];

  return <div className="assistant-view">
    <section className="assistant-workspace">
      <header className="assistant-header">
        <div><span className="eyebrow"><Sparkles /> COMPANY KNOWLEDGE</span><h1>Ask the manual.</h1><p>Company answers, with the website source attached.</p></div>
        <div className="assistant-header-actions">
          {Boolean(history.data?.length) && <button className="clear-chat" onClick={() => clear.mutate()} disabled={clear.isPending}><Trash2 /> Clear</button>}
          <button className="manual-mobile-button" onClick={() => setManualOpen((open) => !open)}><Library /> Browse manual</button>
        </div>
      </header>

      <div className="assistant-scope"><ShieldCheck /><span><strong>Public website knowledge.</strong> Internal HR policies and staff details are not included. The assistant will say when it doesn’t know.</span></div>

      <div className="assistant-conversation" aria-live="polite">
        {history.isLoading && <div className="assistant-loading"><LoaderCircle className="spin" /> Opening your company conversation…</div>}
        {history.error && <div className="assistant-error"><AlertCircle /><div><strong>We couldn’t load your conversation.</strong><p>{history.error.message}</p><Button variant="outline" onClick={() => void history.refetch()}>Try again</Button></div></div>}

        {!history.isLoading && !history.error && !history.data?.length && <div className="assistant-welcome">
          <div className="assistant-orbit"><Building2 /><span /></div>
          <span className="eyebrow">A GOOD PLACE TO START</span>
          <h2>What would you like to know?</h2>
          <p>Ask in English or Spanish about the company, its materials, importing, locations or public policies.</p>
          <div className="assistant-suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => submit(suggestion)}><MessageSquareText /><span>{suggestion}</span><ChevronRight /></button>)}</div>
        </div>}

        {history.data?.map((message) => <article key={message.id} className={`assistant-message ${message.role}`}>
          <div className="message-label">{message.role === "assistant" ? <><Sparkles /> Manual assistant</> : "You"}</div>
          <div className="message-bubble">{message.body}</div>
          {message.role === "assistant" && message.sources.length > 0 && <div className="message-sources"><span><Check /> Grounded in {message.sources.length} website {message.sources.length === 1 ? "page" : "pages"}</span>{message.sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><BookOpen />{source.title}<ExternalLink /></a>)}</div>}
        </article>)}

        {ask.isPending && <div className="assistant-message assistant pending"><div className="message-label"><Sparkles /> Manual assistant</div><div className="message-bubble thinking"><i /><i /><i /><span>Reading the relevant manual pages…</span></div></div>}
        {ask.error && <div className="assistant-error"><AlertCircle /><div><strong>{ask.error.message.includes("quota") ? "The assistant is currently unavailable." : "Your question wasn’t answered."}</strong><p>{ask.error.message}</p><Button variant="outline" onClick={() => submit()} disabled={ask.isPending}>Retry deliberately</Button></div></div>}
        <div ref={endRef} />
      </div>

      <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <label htmlFor="company-question" className="sr-only">Ask a company question</label>
        <textarea id="company-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="Ask about the company, products, importing, policies…" rows={2} maxLength={1200} />
        <div className="composer-bottom"><span>Answers use public website sources · AI can make mistakes</span><button type="submit" disabled={!question.trim() || ask.isPending} aria-label="Send company question">{ask.isPending ? <LoaderCircle className="spin" /> : <Send />}</button></div>
      </form>
    </section>

    <aside className={`manual-library ${manualOpen ? "open" : ""}`}>
      <div className="manual-library-heading"><span className="eyebrow"><Library /> SOURCE LIBRARY</span><h2>Browse the manual</h2><p>Read the public material behind the answers.</p></div>
      <div className="manual-filters" aria-label="Filter manual topics">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <div className="manual-document-list">{documents.map((document) => <button key={document.id} onClick={() => setSelectedDocument(document)}><span>{document.category}</span><strong>{document.title}</strong><p>{document.summary}</p><span className="read-manual">Read section <ArrowUpRight /></span></button>)}</div>
      <div className="manual-retrieved"><span className="status-dot" />{manual.data ? `${manual.data.documents.length} sections · Retrieved Nov 5, 2026` : "Loading manual sections…"}</div>
    </aside>

    {selectedDocument && <div className="manual-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedDocument(null); }}>
      <section className="manual-modal" role="dialog" aria-modal="true" aria-labelledby="manual-document-title">
        <button className="manual-modal-close" onClick={() => setSelectedDocument(null)} aria-label="Close manual section"><X /></button>
        <span className="eyebrow">{selectedDocument.category} · PUBLIC SOURCE</span>
        <h2 id="manual-document-title">{selectedDocument.title}</h2>
        <p className="manual-modal-summary">{selectedDocument.summary}</p>
        <div className="manual-full-text">{selectedDocument.content.split("\n").map((paragraph, index) => paragraph.trim() ? <p key={index}>{paragraph}</p> : null)}</div>
        <a className="manual-source-link" href={selectedDocument.url} target="_blank" rel="noreferrer">Open the original website page <ExternalLink /></a>
      </section>
    </div>}
  </div>;
}
