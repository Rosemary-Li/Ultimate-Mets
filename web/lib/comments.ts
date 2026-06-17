import { getPool } from "@/lib/db";

export const COMMENT_TARGETS = ["game", "player", "season"] as const;
export type CommentTarget = (typeof COMMENT_TARGETS)[number];

export interface CommentRow {
  id: string;
  user_id: number;
  user_name: string | null;
  user_image: string | null;
  parent_id: string | null;
  body: string | null; // null when soft-deleted
  created_at: string;
  edited_at: string | null;
  deleted: boolean;
}

/** All comments for a page target, oldest first (threading handled client-side). */
export async function listComments(
  targetType: string,
  targetId: string,
): Promise<CommentRow[]> {
  const { rows } = await getPool().query(
    `SELECT c.id::text, c.user_id, u.name AS user_name, u.image AS user_image,
            c.parent_id::text,
            CASE WHEN c.deleted_at IS NULL THEN c.body END AS body,
            c.created_at, c.edited_at, (c.deleted_at IS NOT NULL) AS deleted
       FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.target_type = $1 AND c.target_id = $2
      ORDER BY c.created_at ASC`,
    [targetType, targetId],
  );
  return rows as CommentRow[];
}

/** Insert a comment (optionally a reply) and return it joined to the author. */
export async function addComment(opts: {
  userId: string;
  targetType: string;
  targetId: string;
  body: string;
  parentId?: string | null;
}): Promise<CommentRow> {
  const { rows } = await getPool().query(
    `WITH ins AS (
       INSERT INTO comments (user_id, target_type, target_id, body, parent_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *
     )
     SELECT ins.id::text, ins.user_id, u.name AS user_name, u.image AS user_image,
            ins.parent_id::text, ins.body, ins.created_at, ins.edited_at,
            false AS deleted
       FROM ins JOIN users u ON u.id = ins.user_id`,
    [opts.userId, opts.targetType, opts.targetId, opts.body, opts.parentId ?? null],
  );
  return rows[0] as CommentRow;
}

/** Soft-delete a comment — only if it belongs to the requesting user. */
export async function deleteComment(id: string, userId: string): Promise<boolean> {
  const { rowCount } = await getPool().query(
    `UPDATE comments SET deleted_at = now()
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [id, userId],
  );
  return (rowCount ?? 0) > 0;
}
