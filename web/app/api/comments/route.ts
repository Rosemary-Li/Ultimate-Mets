import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  listComments,
  addComment,
  deleteComment,
  COMMENT_TARGETS,
} from "@/lib/comments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LEN = 2000;
const isTarget = (t: string | null): t is string =>
  !!t && (COMMENT_TARGETS as readonly string[]).includes(t);

// GET /api/comments?type=game&id=775304  — public
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  if (!isTarget(type) || !id) {
    return NextResponse.json({ error: "bad target" }, { status: 400 });
  }
  const comments = await listComments(type, id);
  return NextResponse.json({ comments });
}

// POST /api/comments  { type, id, body, parentId? } — auth required
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }
  const { type, id, body, parentId } = await request.json().catch(() => ({}));
  if (!isTarget(type) || !id) {
    return NextResponse.json({ error: "bad target" }, { status: 400 });
  }
  const text = typeof body === "string" ? body.trim() : "";
  if (!text || text.length > MAX_LEN) {
    return NextResponse.json({ error: "empty or too long" }, { status: 400 });
  }
  const comment = await addComment({
    userId: session.user.id,
    targetType: type,
    targetId: String(id),
    body: text,
    parentId: parentId ? String(parentId) : null,
  });
  return NextResponse.json({ comment }, { status: 201 });
}

// DELETE /api/comments?id=42 — auth required, own comments only
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const ok = await deleteComment(id, session.user.id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
