import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUpRight, BookOpen, Building2, Check, ChevronRight, ExternalLink, FileText, GraduationCap, Library, LoaderCircle, Mail, MessageSquareText, Pencil, Phone, Plus, Send, ShieldCheck, Sparkles, Trash2, UserRound, UsersRound, X } from "lucide-react";
import { trpc, type RouterOutputs } from "@/providers/trpc";
import { Button } from "@/components/ui/button";

type ManualDocument = RouterOutputs["assistant"]["manual"]["documents"][number];
type LibraryView = "manual" | "contacts" | "learning";
type ResourceKind = "document" | "contact" | "course" | "file";

const publicSuggestions = [
  "¿Qué hace UNITEC USA Design?",
  "¿Cuál es la diferencia entre FOB y CIF?",
  "¿Dónde están la oficina de Miami y el showroom de Medellín?",
  "¿Qué productos ofrece la empresa?",
];

export function CompanyAssistant({ isAdmin }: { isAdmin: boolean }) {
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("Todo");
  const [libraryView, setLibraryView] = useState<LibraryView>("manual");
  const [selectedDocument, setSelectedDocument] = useState<ManualDocument | null>(null);
  const [editingDocument, setEditingDocument] = useState<ManualDocument | null | "new">(null);
  const [manualOpen, setManualOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const history = trpc.assistant.history.useQuery();
  const manual = trpc.assistant.manual.useQuery();
  const ask = trpc.assistant.ask.useMutation({
    onSuccess: async () => { setQuestion(""); await utils.assistant.history.invalidate(); },
  });
  const clear = trpc.assistant.clear.useMutation({ onSuccess: async () => { await utils.assistant.history.invalidate(); } });
  const remove = trpc.assistant.deleteResource.useMutation({
    onSuccess: async () => { setSelectedDocument(null); await utils.assistant.manual.invalidate(); },
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
  const learning = internalDocuments.filter((document) => document.kind === "course" || document.kind === "file");
  const manualDocuments = allDocuments.filter((document) => document.kind !== "contact" && document.kind !== "course" && document.kind !== "file");
  const categories = ["Todo", ...new Set(manualDocuments.map((document) => document.category))];
  const documents = manualDocuments.filter((document) => category === "Todo" || document.category === category);
  const suggestions = [
    ...(contacts.length ? ["¿Con quién debo hablar sobre un tema de RR. HH.?"] : []),
    ...(learning.length ? ["¿Qué cursos y documentos tengo disponibles?"] : []),
    ...(internalDocuments.some((document) => document.kind === "document") ? ["¿Qué estándares internos debo seguir?"] : []),
    ...publicSuggestions,
  ].slice(0, 4);

  function openSource(source: { id: string }) {
    const document = allDocuments.find((item) => item.id === source.id);
    if (document) setSelectedDocument(document);
  }

  function addResource() { setEditingDocument("new"); }

  return <div className="assistant-view">
    <section className="assistant-workspace">
      <header className="assistant-header">
        <div><span className="eyebrow"><Sparkles /> EMPRESA Y RR. HH., EN UN SOLO LUGAR</span><h1>Pregunta al manual.</h1><p>Respuestas, estándares, formación y las personas indicadas.</p></div>
        <div className="assistant-header-actions">
          {Boolean(history.data?.length) && <button className="clear-chat" onClick={() => clear.mutate()} disabled={clear.isPending}><Trash2 /> Borrar</button>}
          <button className="manual-mobile-button" onClick={() => setManualOpen((open) => !open)}><Library /> Centro de empresa</button>
        </div>
      </header>

      <div className="assistant-scope"><ShieldCheck /><span><strong>Información pública + recursos internos publicados por un administrador.</strong> Si una política, un contacto o una respuesta no está publicada, el asistente lo dirá claramente.</span></div>

      <div className="assistant-conversation" aria-live="polite">
        {history.isLoading && <div className="assistant-loading"><LoaderCircle className="spin" /> Abriendo tu conversación…</div>}
        {history.error && <div className="assistant-error"><AlertCircle /><div><strong>No pudimos cargar tu conversación.</strong><p>{history.error.message}</p><Button variant="outline" onClick={() => void history.refetch()}>Intentar de nuevo</Button></div></div>}

        {!history.isLoading && !history.error && !history.data?.length && <div className="assistant-welcome">
          <div className="assistant-orbit"><Building2 /><span /></div>
          <span className="eyebrow">UN BUEN PUNTO DE PARTIDA</span>
          <h2>¿Qué quieres saber?</h2>
          <p>Pregunta por la empresa, estándares internos, personas de contacto, cursos, materiales, importaciones o ubicaciones.</p>
          <div className="assistant-suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => submit(suggestion)}><MessageSquareText /><span>{suggestion}</span><ChevronRight /></button>)}</div>
        </div>}

        {history.data?.map((message) => <article key={message.id} className={`assistant-message ${message.role}`}>
          <div className="message-label">{message.role === "assistant" ? <><Sparkles /> Asistente del manual</> : "Tú"}</div>
          <div className="message-bubble">{message.body}</div>
          {message.role === "assistant" && message.sources.length > 0 && <div className="message-sources"><span><Check /> Basado en {message.sources.length} {message.sources.length === 1 ? "fuente de la empresa" : "fuentes de la empresa"}</span>{message.sources.map((source) => source.url ? <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><BookOpen />{source.title}<ExternalLink /></a> : <button key={source.id} onClick={() => openSource(source)}><ShieldCheck />{source.title}<ArrowUpRight /></button>)}</div>}
        </article>)}

        {ask.isPending && <div className="assistant-message assistant pending"><div className="message-label"><Sparkles /> Asistente del manual</div><div className="message-bubble thinking"><i /><i /><i /><span>Revisando las fuentes de la empresa…</span></div></div>}
        {ask.error && <div className="assistant-error"><AlertCircle /><div><strong>{ask.error.message.includes("cupo") ? "El asistente no está disponible." : "No pudimos responder tu pregunta."}</strong><p>{ask.error.message}</p><Button variant="outline" onClick={() => submit()} disabled={ask.isPending}>Reintentar</Button></div></div>}
        <div ref={endRef} />
      </div>

      <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <label htmlFor="company-question" className="sr-only">Pregunta sobre la empresa o RR. HH.</label>
        <textarea id="company-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="Pregunta por estándares, contactos, cursos, la empresa…" rows={2} maxLength={1200} />
        <div className="composer-bottom"><span>Usa fuentes públicas e internas · La IA puede equivocarse</span><button type="submit" disabled={!question.trim() || ask.isPending} aria-label="Enviar pregunta">{ask.isPending ? <LoaderCircle className="spin" /> : <Send />}</button></div>
      </form>
    </section>

    <aside className={`manual-library ${manualOpen ? "open" : ""}`}>
      <div className="manual-library-heading"><span className="eyebrow"><Library /> CENTRO DE LA EMPRESA</span><h2>Todo en un solo lugar.</h2><p>Instrucciones, formación y responsables.</p>{isAdmin && <button className="add-resource-button" onClick={addResource}><Plus /> Agregar recurso</button>}</div>
      <div className="library-view-tabs three"><button className={libraryView === "manual" ? "active" : ""} onClick={() => setLibraryView("manual")}><BookOpen /> Manual <span>{manualDocuments.length}</span></button><button className={libraryView === "learning" ? "active" : ""} onClick={() => setLibraryView("learning")}><GraduationCap /> Formación <span>{learning.length}</span></button><button className={libraryView === "contacts" ? "active" : ""} onClick={() => setLibraryView("contacts")}><UsersRound /> Contactos <span>{contacts.length}</span></button></div>

      {libraryView === "manual" && <>
        <div className="manual-filters" aria-label="Filtrar temas del manual">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <div className="manual-document-list">{documents.map((document) => <article className="manual-document-item" key={document.id}>
          <button className="manual-document-open" onClick={() => setSelectedDocument(document)}><span>{document.visibility === "private" ? "Interno" : "Público"} · {document.category}{document.isPublished === false ? " · Borrador" : ""}</span><strong>{document.title}</strong><p>{document.summary}</p><span className="read-manual">Leer sección <ArrowUpRight /></span></button>
          {isAdmin && document.resourceId && <button className="edit-resource" onClick={() => setEditingDocument(document)} aria-label={`Editar ${document.title}`}><Pencil /></button>}
        </article>)}</div>
      </>}

      {libraryView === "learning" && <div className="learning-directory">
        {!learning.length && <div className="contact-empty"><GraduationCap /><h3>Aún no hay cursos ni documentos.</h3><p>{isAdmin ? "Agrega enlaces verificados a cursos, presentaciones, videos, manuales u otros documentos para el personal." : "Un administrador debe publicar los enlaces de formación y documentos del personal."}</p>{isAdmin && <button onClick={addResource}><Plus /> Agregar el primero</button>}</div>}
        {learning.map((resource) => <article className="learning-card" key={resource.id}>
          <div className="learning-icon">{resource.kind === "course" ? <GraduationCap /> : <FileText />}</div>
          <div className="learning-copy"><span>{resource.kind === "course" ? "Curso" : "Documento"} · {resource.category}{resource.isPublished === false ? " · Borrador" : ""}</span><h3>{resource.title}</h3><p>{resource.summary}</p>{resource.body && resource.body !== resource.summary && <p>{resource.body}</p>}<div className="learning-actions">{resource.url && <a href={resource.url} target="_blank" rel="noreferrer">{resource.kind === "course" ? "Abrir curso" : "Abrir documento"}<ExternalLink /></a>}{isAdmin && <><button onClick={() => setEditingDocument(resource)}><Pencil /> Editar</button><button disabled={remove.isPending} onClick={() => { if (window.confirm(`¿Eliminar “${resource.title}”? Esta acción no se puede deshacer.`)) remove.mutate({ id: resource.resourceId! }); }}><Trash2 /> Eliminar</button></>}</div></div>
        </article>)}
      </div>}

      {libraryView === "contacts" && <div className="contact-directory">
        {!contacts.length && <div className="contact-empty"><UserRound /><h3>Aún no hay contactos internos.</h3><p>{isAdmin ? "Agrega la persona o el equipo, sus responsabilidades, la línea de reporte y los datos de contacto verificados." : "Un administrador debe publicar los contactos de RR. HH., reportes y escalamiento."}</p>{isAdmin && <button onClick={addResource}><Plus /> Agregar el primero</button>}</div>}
        {contacts.map((contact) => <article className="contact-card" key={contact.id}>
          <div className="contact-card-top"><span className="contact-initial">{contact.title.charAt(0)}</span><div><span>{contact.category}{contact.isPublished === false ? " · Borrador" : ""}</span><h3>{contact.title}</h3><p>{contact.summary}</p></div>{isAdmin && <button className="edit-resource" onClick={() => setEditingDocument(contact)} aria-label={`Editar ${contact.title}`}><Pencil /></button>}</div>
          <p className="contact-responsibilities">{contact.body}</p>
          {contact.reportsTo && <div className="reporting-line"><strong>Reporta o escala a</strong><span>{contact.reportsTo}</span></div>}
          <div className="contact-actions">{contact.phone && <a href={`tel:${contact.phone}`}><Phone />{contact.phone}</a>}{contact.email && <a href={`mailto:${contact.email}`}><Mail />{contact.email}</a>}</div>
        </article>)}
      </div>}
      <div className="manual-retrieved"><span className="status-dot" />{internalDocuments.length} internos · {allDocuments.length - internalDocuments.length} recursos públicos</div>
    </aside>

    {selectedDocument && <div className="manual-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedDocument(null); }}>
      <section className="manual-modal" role="dialog" aria-modal="true" aria-labelledby="manual-document-title">
        <button className="manual-modal-close" onClick={() => setSelectedDocument(null)} aria-label="Cerrar sección"><X /></button>
        <span className="eyebrow">{selectedDocument.visibility === "private" ? "INTERNO · PUBLICADO POR UN ADMINISTRADOR" : "SITIO WEB PÚBLICO"} · {selectedDocument.category}</span>
        <h2 id="manual-document-title">{selectedDocument.title}</h2>
        <p className="manual-modal-summary">{selectedDocument.summary}</p>
        <div className="manual-full-text">{selectedDocument.content.split("\n").map((paragraph, index) => paragraph.trim() ? <p key={index}>{paragraph}</p> : null)}</div>
        {selectedDocument.url ? <a className="manual-source-link" href={selectedDocument.url} target="_blank" rel="noreferrer">{selectedDocument.visibility === "private" ? "Abrir recurso" : "Abrir página original"}<ExternalLink /></a> : <div className="internal-source-stamp"><ShieldCheck /> Visible solo para colaboradores autenticados{selectedDocument.isPublished === false ? " · Borrador visible para administradores" : ""}</div>}
        {isAdmin && selectedDocument.resourceId && <div className="resource-modal-actions"><Button variant="outline" onClick={() => { setEditingDocument(selectedDocument); setSelectedDocument(null); }}><Pencil /> Editar</Button><Button variant="outline" disabled={remove.isPending} onClick={() => { if (window.confirm("¿Eliminar este recurso interno? Esta acción no se puede deshacer.")) remove.mutate({ id: selectedDocument.resourceId! }); }}><Trash2 /> Eliminar</Button></div>}
      </section>
    </div>}

    {editingDocument && <ResourceEditor document={editingDocument === "new" ? null : editingDocument} defaultKind={libraryView === "contacts" ? "contact" : libraryView === "learning" ? "course" : "document"} onClose={() => setEditingDocument(null)} onSaved={async () => { setEditingDocument(null); await utils.assistant.manual.invalidate(); }} />}
  </div>;
}

function ResourceEditor({ document, defaultKind, onClose, onSaved }: { document: ManualDocument | null; defaultKind: ResourceKind; onClose: () => void; onSaved: () => Promise<void> }) {
  const [kind, setKind] = useState<ResourceKind>(document?.kind ?? defaultKind);
  const [title, setTitle] = useState(document?.title ?? "");
  const [category, setCategory] = useState(document?.category ?? (defaultKind === "contact" ? "RR. HH." : defaultKind === "course" || defaultKind === "file" ? "Formación" : "Estándares"));
  const [summary, setSummary] = useState(document?.summary ?? "");
  const [body, setBody] = useState(document?.body ?? "");
  const [url, setUrl] = useState(document?.url ?? "");
  const [phone, setPhone] = useState(document?.phone ?? "");
  const [email, setEmail] = useState(document?.email ?? "");
  const [reportsTo, setReportsTo] = useState(document?.reportsTo ?? "");
  const [isPublished, setIsPublished] = useState(document?.isPublished ?? true);
  const save = trpc.assistant.saveResource.useMutation({ onSuccess: onSaved });
  const isLink = kind === "course" || kind === "file";

  return <div className="manual-modal-backdrop resource-editor-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="resource-editor" onSubmit={(event) => { event.preventDefault(); save.mutate({ id: document?.resourceId, kind, title, category, summary, body, url, phone, email, reportsTo, isPublished }); }}>
      <button type="button" className="manual-modal-close" onClick={onClose} aria-label="Cerrar editor"><X /></button>
      <span className="eyebrow">ADMINISTRACIÓN · CONOCIMIENTO INTERNO</span>
      <h2>{document ? "Editar recurso" : "Agregar un recurso confiable"}</h2>
      <p>Publica únicamente información verificada. El personal y el asistente usarán exactamente lo que ingreses.</p>
      <div className="resource-form-grid">
        <label>Tipo de recurso<select value={kind} onChange={(event) => setKind(event.target.value as ResourceKind)}><option value="document">Política / estándar / instructivo</option><option value="contact">Contacto / responsabilidad de reporte</option><option value="course">Curso (enlace)</option><option value="file">Documento (enlace)</option></select></label>
        <label>Categoría<input value={category} onChange={(event) => setCategory(event.target.value)} list="resource-categories" required maxLength={80} /><datalist id="resource-categories"><option value="Políticas de RR. HH." /><option value="Estándares" /><option value="Reportes" /><option value="Inducción" /><option value="Seguridad" /><option value="RR. HH." /><option value="Dirección" /><option value="Soporte de TI" /><option value="Formación" /><option value="Documentos generales" /></datalist></label>
        <label className="full">{kind === "contact" ? "Nombre o equipo" : kind === "course" ? "Nombre del curso" : kind === "file" ? "Nombre del documento" : "Título del documento"}<input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={180} /></label>
        <label className="full">{kind === "contact" ? "Cargo / área" : "Resumen corto"}<input value={summary} onChange={(event) => setSummary(event.target.value)} required minLength={2} maxLength={500} /></label>
        <label className="full">{kind === "contact" ? "Responsabilidades y cuándo contactarlo" : isLink ? "Descripción, instrucciones de acceso o temas" : "Instructivo o política completa"}<textarea value={body} onChange={(event) => setBody(event.target.value)} required minLength={2} maxLength={20000} rows={isLink ? 4 : 8} /></label>
        {isLink && <label className="full">Enlace del curso o documento<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} required placeholder="https://…" maxLength={2048} /></label>}
        {kind === "contact" && <><label>Teléfono / WhatsApp<input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={60} /></label><label>Correo electrónico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={320} /></label><label className="full">Reporta a / ruta de escalamiento<input value={reportsTo} onChange={(event) => setReportsTo(event.target.value)} maxLength={180} placeholder="Ingresa únicamente una línea de reporte verificada" /></label></>}
      </div>
      <label className="publish-resource"><input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} /><span><strong>Publicar para el personal</strong><small>Desmarca esta opción para guardarlo como borrador de administración.</small></span></label>
      {save.error && <div className="resource-save-error">{save.error.message}</div>}
      <div className="resource-editor-actions"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? <LoaderCircle className="spin" /> : <Check />} {isPublished ? "Publicar recurso" : "Guardar borrador"}</Button></div>
    </form>
  </div>;
}
