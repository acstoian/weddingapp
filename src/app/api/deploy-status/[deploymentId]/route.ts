import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDeploymentService } from "@/lib/services/deployment.service";
import { sendPublishSuccessEmail } from "@/lib/services/email.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

interface RouteContext {
  params: Promise<{ deploymentId: string }>;
}

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

function sseEvent(
  controller: ReadableStreamDefaultController,
  data: object
): void {
  const encoder = new TextEncoder();
  controller.enqueue(
    encoder.encode(`event: status\ndata: ${JSON.stringify(data)}\n\n`)
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { deploymentId } = await context.params;

  // Stub simulation: when deploymentId starts with 'stub_', no real credentials are
  // configured — simulate BUILDING → READY with a fake URL after 2s.
  if (deploymentId.startsWith("stub_")) {
    const stream = new ReadableStream({
      async start(controller) {
        sseEvent(controller, { status: "BUILDING", url: null });
        await new Promise((r) => setTimeout(r, 2000));

        const fakeUrl = `https://invitation-${userId.slice(0, 8)}.vercel.app`;

        await db
          .update(invitations)
          .set({
            status: "LIVE",
            liveUrl: fakeUrl,
            lastPublishedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(invitations.vercelDeployId, deploymentId));

        sseEvent(controller, { status: "READY", url: fakeUrl });
        controller.close();
      },
    });
    return new Response(stream, { headers: SSE_HEADERS });
  }

  // Real flow: look up invitation for title, get user email from Clerk
  const [invitation] = await db
    .select({ title: invitations.title })
    .from(invitations)
    .where(eq(invitations.vercelDeployId, deploymentId));

  const invitationTitle = invitation?.title ?? "Invitatia mea";

  let userEmail = "";
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    userEmail = user.emailAddresses[0]?.emailAddress ?? "";
  } catch {
    // non-fatal — email is best-effort
  }

  // Poll Vercel every 3s; update DB and send email on completion.
  const stream = new ReadableStream({
    async start(controller) {
      let done = false;
      while (!done) {
        try {
          const status = await getDeploymentService().pollStatus(deploymentId);

          if (status === "READY") {
            // Fetch the live URL from Vercel
            let liveUrl = "";
            try {
              const res = await fetch(
                `https://api.vercel.com/v13/deployments/${deploymentId}`,
                {
                  headers: {
                    Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
                  },
                }
              );
              const data = (await res.json()) as { url?: string };
              liveUrl = data.url ? `https://${data.url}` : "";
            } catch {
              // keep liveUrl empty
            }

            await db
              .update(invitations)
              .set({
                status: "LIVE",
                liveUrl,
                lastPublishedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(invitations.vercelDeployId, deploymentId));

            if (userEmail) {
              await sendPublishSuccessEmail(userEmail, invitationTitle, liveUrl);
            }

            sseEvent(controller, { status: "READY", url: liveUrl });
            done = true;
            controller.close();
          } else {
            // QUEUED or BUILDING
            sseEvent(controller, { status: "BUILDING", url: null });
            await new Promise((r) => setTimeout(r, 3000));
          }
        } catch (err) {
          console.error("[deploy-status] poll error:", err);

          await db
            .update(invitations)
            .set({ status: "FAILED", updatedAt: new Date() })
            .where(eq(invitations.vercelDeployId, deploymentId));

          sseEvent(controller, { status: "ERROR", url: null });
          done = true;
          controller.close();
        }
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
