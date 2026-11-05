import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc, type CommunityUser, type FeedPost } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PersonAvatar } from "./PersonAvatar";
import { MediaButtons, MediaView, useMediaUpload } from "./Media";

const topics = ["Motivation", "Outside work", "Wins", "Questions"] as const;

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
      toast.success("Shared with your community");
    },
    onError: (error) => toast.error(error.message),
  });

  function submit() {
    create.mutate({ body, topic, mediaKey: media.attachment?.key, mediaType: media.attachment?.contentType });
  }

  const visiblePosts = feed.data?.filter((post) => filter === "For you" || post.topic === filter) ?? [];

  return (
    <div className="feed-view">
      <section className="page-intro">
        <p className="meta-label">YOUR PEOPLE, YOUR SPACE</p>
        <h1>Good to see you, {currentUser.name?.split(" ")[0] ?? "friend"}.</h1>
        <p>Share a win, ask a question, or talk about life beyond the to-do list.</p>
      </section>

      <section className="composer" aria-label="Create a post">
        <div className="composer-top">
          <PersonAvatar person={{ ...currentUser, id: currentUser.id, name: currentUser.name ?? "You" }} />
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="What’s on your mind?" maxLength={2000} rows={3} />
        </div>
        {media.attachment && <div className="composer-preview"><MediaView mediaKey={media.attachment.key} mediaType={media.attachment.contentType} /></div>}
        <div className="composer-actions">
          <MediaButtons {...media} />
          <div className="post-actions">
            <select value={topic} onChange={(event) => setTopic(event.target.value as (typeof topics)[number])} aria-label="Post topic">
              {topics.map((item) => <option key={item}>{item}</option>)}
            </select>
            <Button onClick={submit} disabled={create.isPending || media.isUploading || (!body.trim() && !media.attachment)}>
              <Send />{create.isPending ? "Sharing…" : "Share"}
            </Button>
          </div>
        </div>
      </section>

      <div className="feed-filter" aria-label="Filter posts">
        {["For you", ...topics, "Celebration"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}
      </div>

      <div className="feed-list" aria-live="polite">
        {feed.isLoading && [1, 2].map((item) => <div className="post-skeleton" key={item} />)}
        {feed.error && <div className="empty-state"><h2>We lost the thread.</h2><p>{feed.error.message}</p><Button onClick={() => void feed.refetch()}>Try again</Button></div>}
        {!feed.isLoading && !visiblePosts.length && <div className="empty-state"><Sparkles /><h2>Start the conversation.</h2><p>There are no posts in this space yet. Your first note can change that.</p></div>}
        {visiblePosts.map((post) => <PostCard key={post.id} post={post} currentUser={currentUser} />)}
      </div>
    </div>
  );
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

  return (
    <article className="post-card">
      <header className="post-header">
        <PersonAvatar person={post.author} />
        <div><strong>{post.author.name}{post.author.isDemo && <span className="sample-tag">SAMPLE</span>}</strong><p>{post.author.jobTitle || "Colleague"} · {formatDistanceToNow(post.createdAt, { addSuffix: true })}</p></div>
        <span className="topic-label">{post.topic}</span>
      </header>
      {post.body && <p className="post-body">{post.body}</p>}
      {post.mediaKey && <MediaView mediaKey={post.mediaKey} mediaType={post.mediaType} />}
      <footer className="post-footer">
        <button className={post.liked ? "liked" : ""} onClick={() => like.mutate({ postId: post.id })} disabled={like.isPending} aria-label={post.liked ? "Unlike post" : "Like post"}><Heart fill={post.liked ? "currentColor" : "none"} />{post.likeCount || "Like"}</button>
        <button onClick={() => setShowComments((value) => !value)} aria-expanded={showComments}><MessageCircle />{post.comments.length || "Reply"}</button>
      </footer>
      {showComments && <div className="comments">
        {post.comments.map((item) => <div className="comment" key={item.id}><PersonAvatar person={item.author} size="sm" /><div><strong>{item.author.name}</strong><p>{item.body}</p></div></div>)}
        <form className="comment-form" onSubmit={(event) => { event.preventDefault(); if (comment.trim()) addComment.mutate({ postId: post.id, body: comment }); }}>
          <PersonAvatar person={{ ...currentUser, id: currentUser.id, name: currentUser.name ?? "You" }} size="sm" />
          <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a thoughtful reply…" maxLength={1000} />
          <Button size="icon" type="submit" disabled={!comment.trim() || addComment.isPending} aria-label="Send reply"><Send /></Button>
        </form>
      </div>}
    </article>
  );
}
