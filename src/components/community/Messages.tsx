import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, MessageCircle, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { trpc, type CommunityUser, type ConversationItem } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PersonAvatar } from "./PersonAvatar";
import { MediaButtons, MediaView, useMediaUpload } from "./Media";

export function Messages({ currentUser, activeConversation, setActiveConversation, onFindPeople }: {
  currentUser: CommunityUser;
  activeConversation: number | null;
  setActiveConversation: (id: number | null) => void;
  onFindPeople: () => void;
}) {
  const conversations = trpc.community.conversations.useQuery(undefined, { refetchInterval: 15000 });
  const selected = conversations.data?.find((item) => item.id === activeConversation);

  return (
    <div className={`messages-view ${activeConversation ? "thread-open" : ""}`}>
      <aside className="conversation-list">
        <div className="messages-heading"><div><p className="meta-label">UNO A UNO</p><h1>Mensajes</h1></div><Button variant="outline" size="icon" onClick={onFindPeople} aria-label="Buscar persona para enviar un mensaje"><Users /></Button></div>
        <p className="messages-note">Un espacio tranquilo para dos. Los mensajes se actualizan automáticamente.</p>
        {conversations.isLoading && <div className="post-skeleton" />}
        {!conversations.isLoading && !conversations.data?.length && <div className="conversation-empty"><MessageCircle /><h2>Aún no hay conversaciones</h2><p>Busca un colega y salúdalo.</p><Button onClick={onFindPeople}>Buscar personas</Button></div>}
        {conversations.data?.map((conversation) => conversation.other && <button className={`conversation-item ${activeConversation === conversation.id ? "active" : ""}`} key={conversation.id} onClick={() => setActiveConversation(conversation.id)}>
          <PersonAvatar person={conversation.other} />
          <span><strong>{conversation.other.name}</strong><small>{conversation.lastMessage?.body || (conversation.lastMessage?.mediaKey ? "Compartió un archivo" : "Inicia la conversación")}</small></span>
          {conversation.lastMessage && <time>{formatDistanceToNow(conversation.lastMessage.createdAt, { locale: es })}</time>}
        </button>)}
      </aside>
      <section className="message-thread">
        {selected?.other ? <Thread key={selected.id} conversationId={selected.id} other={selected.other} currentUser={currentUser} onBack={() => setActiveConversation(null)} /> : <div className="thread-placeholder"><MessageCircle /><h2>Tu conversación empieza aquí.</h2><p>Elige un mensaje o busca a alguien nuevo para hablar.</p><Button onClick={onFindPeople}>Buscar personas</Button></div>}
      </section>
    </div>
  );
}

function Thread({ conversationId, other, currentUser, onBack }: { conversationId: number; other: NonNullable<ConversationItem["other"]>; currentUser: CommunityUser; onBack: () => void }) {
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const media = useMediaUpload();
  const utils = trpc.useUtils();
  const messages = trpc.community.messages.useQuery({ conversationId }, { refetchInterval: 5000 });
  const send = trpc.community.sendMessage.useMutation({
    onSuccess: () => {
      setBody("");
      media.setAttachment(null);
      void utils.community.messages.invalidate({ conversationId });
      void utils.community.conversations.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.data?.length]);

  function submit() {
    send.mutate({ conversationId, body, mediaKey: media.attachment?.key, mediaType: media.attachment?.contentType });
  }

  return <>
    <header className="thread-header"><Button variant="ghost" size="icon" className="thread-back" onClick={onBack} aria-label="Volver a conversaciones"><ArrowLeft /></Button><PersonAvatar person={other} /><div><strong>{other.name}</strong><p>{other.jobTitle || "Colega"}</p></div></header>
    <div className="message-history" aria-live="polite">
      {messages.isLoading && <p className="muted-copy">Cargando mensajes…</p>}
      {!messages.isLoading && !messages.data?.length && <div className="first-message"><PersonAvatar person={other} size="lg" /><h2>Saluda a {other.name.split(" ")[0]}.</h2><p>Los dos tienen {other.interests[0] ? `un interés en ${other.interests[0]} para comenzar` : "mucho por descubrir el uno del otro"}.</p></div>}
      {messages.data?.map((message) => <div className={`message-bubble ${message.senderId === currentUser.id ? "mine" : "theirs"}`} key={message.id}>
        {message.body && <p>{message.body}</p>}
        {message.mediaKey && <MediaView mediaKey={message.mediaKey} mediaType={message.mediaType} />}
        <time>{formatDistanceToNow(message.createdAt, { addSuffix: true, locale: es })}</time>
      </div>)}
      <div ref={endRef} />
    </div>
    <div className="message-composer">
      {media.attachment && <MediaView mediaKey={media.attachment.key} mediaType={media.attachment.contentType} />}
      <div className="message-input-row"><Textarea rows={1} value={body} onChange={(event) => setBody(event.target.value)} placeholder={`Mensaje para ${other.name.split(" ")[0]}…`} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if ((body.trim() || media.attachment) && !media.isUploading && !send.isPending) submit(); } }} /><Button size="icon" onClick={submit} disabled={send.isPending || media.isUploading || (!body.trim() && !media.attachment)} aria-label="Enviar mensaje"><Send /></Button></div>
      <MediaButtons {...media} compact />
    </div>
  </>;
}
