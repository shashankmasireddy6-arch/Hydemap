import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getAdminDb } from "@/lib/firebaseAdmin";

// Only "Comments" fields the client is trusted to send — the actual
// recipient (the post's private email) is looked up server-side via the
// Admin SDK below, never taken from the request body.
interface NotifyRequestBody {
  postId?: string;
  commenterName?: string;
  commentText?: string;
}

// Not constructed at module load — a missing RESEND_API_KEY should only
// fail requests to this route, not crash the whole server.
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

export async function POST(request: NextRequest) {
  let body: NotifyRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { postId, commenterName, commentText } = body;
  if (!postId || !commenterName || !commentText) {
    return NextResponse.json(
      { error: "postId, commenterName, and commentText are required" },
      { status: 400 }
    );
  }

  const resend = getResendClient();
  if (!resend) {
    console.error("RESEND_API_KEY is not set — skipping comment notification email.");
    return NextResponse.json({ error: "Email service not configured" }, { status: 501 });
  }

  try {
    const postSnapshot = await getAdminDb().collection("posts").doc(postId).get();
    const email = postSnapshot.data()?.email as string | undefined;

    // No email was given at post creation (it's an optional field) —
    // nothing to notify, not a failure.
    if (!email) {
      return NextResponse.json({ skipped: "no email on file for this post" });
    }

    const title = (postSnapshot.data()?.title as string | undefined) ?? "your listing";

    // "onboarding@resend.dev" works without any domain setup, but Resend
    // restricts it to only deliver to the Resend account's own verified
    // email — real posters (any other address) won't receive anything
    // until a real sending domain is verified. See the README's "Comment
    // notifications" setup section.
    await resend.emails.send({
      from: "Hyderabad Property Map <onboarding@resend.dev>",
      to: email,
      subject: `New comment on "${title}"`,
      text: `${commenterName} commented on your post "${title}":\n\n"${commentText}"`,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("Failed to send comment notification email:", err);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
