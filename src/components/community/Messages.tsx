import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
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
        <div className="messages-heading"><div><p className="meta-label">ONE TO ONE</p><h1>Messages</h1></div><Button variant="outline" size="icon" onClick={onFindPeople} aria-label="Find someone to message"><Users /></Button></div>
        <p className="messages-note">A quiet space for two. Messages refresh automatically.</p>
        {conversations.isLoading && <div className="post-skeleton" />}
        {!conversations.isLoading && !conversations.data?.length && <div className="conversation-empty"><MessageCircle /><h2>No conversations yet</h2><p>Find a colleague and say hello.</p><Button onClick={onFindPeople}>Find people</Button></div>}
        {conversations.data?.map((conversation) => conversation.other && <button className={`conversation-item ${activeConversation === conversation.id ? "active" : ""}`} key={conversation.id} onClick={() => setActiveConversation(conversation.id)}>
          <PersonAvatar person={conversation.other} />
          <span><strong>{conversation.other.name}</strong><small>{conversation.lastMessage?.body || (conversation.lastMessage?.mediaKey ? "Shared an attachment" : "Start the conversation")}</small></span>
          {conversation.lastMessage && <time>{formatDistanceToNow(conversation.lastMessage.createdAt)}</time>}
        </button>)}
      </aside>
      <section className="message-thread">
        {selected?.other ? <Thread key={selected.id} conversationId={selected.id} other={selected.other} currentUser={currentUser} onBack={() => setActiveConversation(null)} /> : <div className="thread-placeholder"><MessageCircle /><h2>Your conversation starts here.</h2><p>Choose a message or find someone new to talk to.</p><Button onClick={onFindPeople}>Find people</Button></div>}
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
    <header className="thread-header"><Button variant="ghost" size="icon" className="thread-back" onClick={onBack} aria-label="Back to conversations"><ArrowLeft /></Button><PersonAvatar person={other} /><div><strong>{other.name}</strong><p>{other.jobTitle || "Colleague"}</p></div></header>
    <div className="message-history" aria-live="polite">
      {messages.isLoading && <p className="muted-copy">Loading messages…</p>}
      {!messages.isLoading && !messages.data?.length && <div className="first-message"><PersonAvatar person={other} size="lg" /><h2>Say hello to {other.name.split(" ")[0]}.</h2><p>You both have {other.interests[0] ? `an interest in ${other.interests[0]} to start with` : "plenty to discover about each other"}.</p></div>}
      {messages.data?.map((message) => <div className={`message-bubble ${message.senderId === currentUser.id ? "mine" : "theirs"}`} key={message.id}>
        {message.body && <p>{message.body}</p>}
        {message.mediaKey && <MediaView mediaKey={message.mediaKey} mediaType={message.mediaType} />}
        <time>{formatDistanceToNow(message.createdAt, { addSuffix: true })}</time>
      </div>)}
      <div ref={endRef} />
    </div>
    <div className="message-composer">
      {media.attachment && <MediaView mediaKey={media.attachment.key} mediaType={media.attachment.contentType} />}
      <div className="message-input-row"><Textarea rows={1} value={body} onChange={(event) => setBody(event.target.value)} placeholder={`Message ${other.name.split(" ")[0]}…`} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if ((body.trim() || media.attachment) && !media.isUploading) submit(); } }} /><Button size="icon" onClick={submit} disabled={send.isPending || media.isUploading || (!body.trim() && !media.attachment)} aria-label="Send message"><Send /></Button></div>
      <MediaButtons {...media} compact />
    </div>
  </>;
}
