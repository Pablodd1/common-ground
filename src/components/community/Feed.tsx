import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Heart, MessageCircle, Send, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc, type CommunityUser, type FeedPost } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PersonAvatar } from "./PersonAvatar";
import { MediaButtons, MediaView, useMediaUpload } from "./Media";

const topics = ["Motivation", "Outside work", "Wins", "Questions"] as const;
const topicLabels: Record<string, string> = { Motivation: "Motivación", "Outside work": "Fuera del trabajo", Wins: "Logros", Questions: "Preguntas", Celebration: "Celebración" };

export function Feed({ currentUser, initialTopic }: { currentUser: CommunityUser; initialTopic?: string }) {
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState<(typeof topics)[number]>(initialTopic === "Questions" ? "Questions" : "Motivation");
  const [filter, setFilter] = useState("For you");
  const media = useMediaUpload();
  const utils = trpc.useUtils();
  const feed = trpc.community.feed.useQuery(undefined, { refetchInterval: 15000 });
  const create = trpc.community.createPost.useMutation({
    onSuccess: () => {
      setBody("");
      media.setAttachment(null);
      void utils.community.feed.invalidate();
      toast.success("Publicación compartida con tu comunidad");
    },
    onError: (error) => toast.error(error.message),
  });

  function submit() {
    create.mutate({ body, topic, mediaKey: media.attachment?.key, mediaType: media.attachment?.contentType });
  }

  const visiblePosts = feed.data?.filter((post) => filter === "For you" || post.topic === filter) ?? [];

  return <div className="feed-view">
    <section className="page-intro">
      <p className="meta-label">TU GENTE, TU ESPACIO</p>
      <h1>Qué bueno verte, {currentUser.name?.split(" ")[0] ?? "colega"}.</h1>
      <p>Comparte un logro, haz una pregunta o habla de la vida más allá de las tareas.</p>
    </section>

    <section className="composer" aria-label="Crear una publicación">
      <div className="composer-top">
        <PersonAvatar person={{ ...currentUser, id: currentUser.id, name: currentUser.name ?? "Tú" }} />
        <Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="¿Qué estás pensando?" maxLength={2000} rows={3} />
      </div>
      {media.attachment && <div className="composer-preview"><MediaView mediaKey={media.attachment.key} mediaType={media.attachment.contentType} /></div>}
      <div className="composer-actions">
        <MediaButtons {...media} />
        <div className="post-actions">
          <select value={topic} onChange={(event) => setTopic(event.target.value as (typeof topics)[number])} aria-label="Tema de la publicación">
            {topics.map((item) => <option key={item} value={item}>{topicLabels[item]}</option>)}
          </select>
          <Button onClick={submit} disabled={create.isPending || media.isUploading || (!body.trim() && !media.attachment)}>
            <Send />{create.isPending ? "Compartiendo…" : "Compartir"}
          </Button>
        </div>
      </div>
    </section>

    <div className="feed-filter" aria-label="Filtrar publicaciones">
      {["For you", ...topics, "Celebration"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "For you" ? "Para ti" : topicLabels[item]}</button>)}
    </div>

    <div className="feed-list" aria-live="polite">
      {feed.isLoading && [1, 2].map((item) => <div className="post-skeleton" key={item} />)}
      {feed.error && <div className="empty-state"><h2>Perdimos el hilo.</h2><p>{feed.error.message}</p><Button onClick={() => void feed.refetch()}>Intentar de nuevo</Button></div>}
      {!feed.isLoading && !visiblePosts.length && <div className="empty-state"><Sparkles /><h2>Inicia la conversación.</h2><p>Aún no hay publicaciones en este espacio. Tu primera nota puede cambiar eso.</p></div>}
      {visiblePosts.map((post) => <PostCard key={post.id} post={post} currentUser={currentUser} />)}
    </div>
  </div>;
}

function PostCard({ post, currentUser }: { post: FeedPost; currentUser: CommunityUser }) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const utils = trpc.useUtils();
  const like = trpc.community.toggleLike.useMutation({ onSuccess: () => void utils.community.feed.invalidate() });
  const addComment = trpc.community.addComment.useMutation({
    onSuccess: () => { setComment(""); void utils.community.feed.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const remove = trpc.community.deletePost.useMutation({
    onSuccess: () => { void utils.community.feed.invalidate(); toast.success("Publicación eliminada"); },
    onError: (error) => toast.error(error.message),
  });
  const isOwn = post.author.id === currentUser.id;

  return <article className="post-card">
    <header className="post-header">
      <PersonAvatar person={post.author} />
      <div><strong>{post.author.name}{post.author.isDemo && <span className="sample-tag">EJEMPLO</span>}</strong><p>{post.author.jobTitle || "Colega"} · {formatDistanceToNow(post.createdAt, { addSuffix: true, locale: es })}</p></div>
      <span className="topic-label">{topicLabels[post.topic]}</span>
      {isOwn && <button className="post-delete" onClick={() => { if (window.confirm("¿Eliminar esta publicación?")) remove.mutate({ postId: post.id }); }} disabled={remove.isPending} aria-label="Eliminar mi publicación" title="Eliminar mi publicación"><Trash2 /></button>}
    </header>
    {post.body && <p className="post-body">{post.body}</p>}
    {post.mediaKey && <MediaView mediaKey={post.mediaKey} mediaType={post.mediaType} />}
    <footer className="post-footer">
      <button className={post.liked ? "liked" : ""} onClick={() => like.mutate({ postId: post.id })} disabled={like.isPending} aria-label={post.liked ? "Quitar me gusta" : "Me gusta"}><Heart fill={post.liked ? "currentColor" : "none"} />{post.likeCount || "Me gusta"}</button>
      <button onClick={() => setShowComments((value) => !value)} aria-expanded={showComments}><MessageCircle />{post.comments.length || "Responder"}</button>
    </footer>
    {showComments && <div className="comments">
      {post.comments.map((item) => <div className="comment" key={item.id}><PersonAvatar person={item.author} size="sm" /><div><strong>{item.author.name}</strong><p>{item.body}</p></div></div>)}
      <form className="comment-form" onSubmit={(event) => { event.preventDefault(); if (comment.trim()) addComment.mutate({ postId: post.id, body: comment }); }}>
        <PersonAvatar person={{ ...currentUser, id: currentUser.id, name: currentUser.name ?? "Tú" }} size="sm" />
        <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Escribe una respuesta…" maxLength={1000} />
        <Button size="icon" type="submit" disabled={!comment.trim() || addComment.isPending} aria-label="Enviar respuesta"><Send /></Button>
      </form>
    </div>}
  </article>;
}
