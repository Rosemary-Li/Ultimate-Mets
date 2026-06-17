"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import SignInModal from "./SignInModal";

interface CommentRow {
  id: string;
  user_id: number;
  user_name: string | null;
  user_image: string | null;
  parent_id: string | null;
  body: string | null;
  created_at: string;
  deleted: boolean;
}

function when(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  if (image)
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="dc-avatar" src={image} alt="" />;
  return (
    <span className="dc-avatar fallback">
      {(name ?? "?").charAt(0).toUpperCase()}
    </span>
  );
}

export default function Discussion({
  targetType,
  targetId,
}: {
  targetType: "game" | "player" | "season";
  targetId: string | number;
}) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showSignIn, setShowSignIn] = useState(false);
  const [busy, setBusy] = useState(false);

  const id = String(targetId);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/comments?type=${targetType}&id=${encodeURIComponent(id)}`,
    );
    const json = await res.json().catch(() => ({ comments: [] }));
    setComments(json.comments ?? []);
    setLoading(false);
  }, [targetType, id]);

  useEffect(() => {
    load();
  }, [load]);

  const post = async (body: string, parentId: string | null) => {
    if (!body.trim()) return;
    setBusy(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: targetType, id, body, parentId }),
    });
    setBusy(false);
    if (res.ok) {
      setText("");
      setReplyText("");
      setReplyTo(null);
      await load();
    }
  };

  const remove = async (cid: string) => {
    const res = await fetch(`/api/comments?id=${cid}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  // group into top-level + replies
  const { roots, repliesByParent } = useMemo(() => {
    const roots: CommentRow[] = [];
    const repliesByParent: Record<string, CommentRow[]> = {};
    for (const c of comments) {
      if (c.parent_id) (repliesByParent[c.parent_id] ??= []).push(c);
      else roots.push(c);
    }
    return { roots, repliesByParent };
  }, [comments]);

  const visibleCount = comments.filter((c) => !c.deleted).length;

  const renderComment = (c: CommentRow, isReply = false) => (
    <div key={c.id} className={`dc-item ${isReply ? "reply" : ""}`}>
      <Avatar name={c.user_name} image={c.user_image} />
      <div className="dc-body">
        <div className="dc-head">
          <span className="dc-name">{c.user_name ?? "Mets fan"}</span>
          <span className="dc-time">{when(c.created_at)}</span>
        </div>
        {c.deleted ? (
          <p className="dc-text deleted">[deleted]</p>
        ) : (
          <p className="dc-text">{c.body}</p>
        )}
        {!c.deleted && (
          <div className="dc-actions">
            {!isReply && userId && (
              <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>
                Reply
              </button>
            )}
            {userId && String(c.user_id) === userId && (
              <button onClick={() => remove(c.id)}>Delete</button>
            )}
          </div>
        )}

        {/* reply composer */}
        {replyTo === c.id && userId && (
          <div className="dc-reply-box">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${c.user_name ?? "this fan"}…`}
              rows={2}
            />
            <button
              className="dc-post"
              disabled={busy || !replyText.trim()}
              onClick={() => post(replyText, c.id)}
            >
              Reply
            </button>
          </div>
        )}

        {/* replies */}
        {(repliesByParent[c.id] ?? []).map((r) => renderComment(r, true))}
      </div>
    </div>
  );

  return (
    <section className="dc-wrap">
      <h2 className="dc-title">
        Discussion <span className="dc-count">{visibleCount}</span>
      </h2>

      {/* composer / sign-in prompt */}
      {status === "authenticated" ? (
        <div className="dc-composer">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your take…"
            rows={3}
            maxLength={2000}
          />
          <button
            className="dc-post"
            disabled={busy || !text.trim()}
            onClick={() => post(text, null)}
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      ) : (
        <div className="dc-signin-prompt">
          <button className="dc-signin" onClick={() => setShowSignIn(true)}>
            Sign in
          </button>{" "}
          to join the discussion.
        </div>
      )}

      {/* list */}
      {loading ? (
        <div className="dc-empty">Loading…</div>
      ) : roots.length === 0 ? (
        <div className="dc-empty">No comments yet — be the first.</div>
      ) : (
        <div className="dc-list">{roots.map((c) => renderComment(c))}</div>
      )}

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </section>
  );
}
