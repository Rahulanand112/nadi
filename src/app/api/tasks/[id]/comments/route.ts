import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { commentService } from "@/server/services/comment.service";

const createSchema = z.object({
  body: z.string().min(1).max(2000),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const comments = await commentService.list({ taskId: id, userId: session.user.id });
    return NextResponse.json(comments);
  } catch (error) {
    return toErrorResponse(error, "Comment listing");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid comment.", code: "VALIDATION" }, { status: 422 });
  }

  try {
    const { id } = await params;
    const comment = await commentService.create({
      taskId: id,
      userId: session.user.id,
      body: parsed.data.body,
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, "Comment creation");
  }
}
