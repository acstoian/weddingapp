import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { GitService } from "@/lib/services/git.service";
import type { InvitationFields } from "@/lib/templates/schema";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const OWNER = "acstoian";
const REPO = "weddingapp";
const BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;

const INVITATION_ID = "inv-abc-123";
const BRANCH = `invitation/${INVITATION_ID}`;
const FILE_PATH = `invitations/${INVITATION_ID}/invitation-config.json`;

const SAMPLE_FIELDS: InvitationFields = {
  title: "Our Wedding",
  names: "Ana & Ion",
  eventDatetime: "2026-09-15T16:00:00.000Z",
  venueName: "Grand Ballroom",
  venueAddress: "123 Main Street, Bucharest",
  personalMessage: "We would love to have you join us!",
};

// ---------------------------------------------------------------------------
// MSW server — baseline handlers (overridden per-test as needed)
// ---------------------------------------------------------------------------

/**
 * NOTE: Octokit@22 encodes '/' in URL path segments as '%2F'.
 * - git.getRef({ ref: 'heads/main' }) → GET .../git/ref/heads%2Fmain
 * - repos.getContent({ path: 'a/b/c' }) → GET .../contents/a%2Fb%2Fc
 * - repos.createOrUpdateFileContents({ path: 'a/b/c' }) → PUT .../contents/a%2Fb%2Fc
 *
 * The msw handler URLs must use the same percent-encoding that Octokit produces.
 */

// Pre-encode the paths as Octokit will send them
const GIT_REF_URL = `${BASE}/git/ref/heads%2Fmain`;
const CONTENTS_URL = `${BASE}/contents/${encodeURIComponent(FILE_PATH)}`;

const server = setupServer(
  // GET /git/ref/heads%2Fmain → base SHA
  http.get(GIT_REF_URL, () => {
    return HttpResponse.json({
      ref: "refs/heads/main",
      object: { sha: "base-sha-123", type: "commit" },
    });
  }),

  // POST /git/refs → 201 (branch created)
  http.post(`${BASE}/git/refs`, () => {
    return HttpResponse.json(
      { ref: `refs/heads/${BRANCH}` },
      { status: 201 }
    );
  }),

  // GET /contents/<encoded-path> → 404 (file does not exist yet)
  http.get(CONTENTS_URL, () => {
    return HttpResponse.json(
      { message: "Not Found" },
      { status: 404 }
    );
  }),

  // PUT /contents/<encoded-path> → commit created
  http.put(CONTENTS_URL, () => {
    return HttpResponse.json({
      commit: { sha: "commit-sha-789" },
      content: { path: FILE_PATH },
    });
  })
);

beforeAll(() => {
  vi.stubEnv("GITHUB_PAT", "test-pat");
  vi.stubEnv("GITHUB_OWNER", OWNER);
  vi.stubEnv("GITHUB_REPO", REPO);
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GitService", () => {
  it("creates branch for new invitation and writes file without SHA", async () => {
    // Default handlers: POST /git/refs → 201, GET /contents → 404, PUT /contents → commit
    const svc = new GitService();
    const result = await svc.writeInvitationBranch(INVITATION_ID, SAMPLE_FIELDS);

    expect(result.branch).toBe(BRANCH);
    expect(result.filePath).toBe(FILE_PATH);
    expect(result.commitSha).toBe("commit-sha-789");
  });

  it("fetches existing file SHA and passes it on update", async () => {
    // Override: GET /contents → existing file with sha
    server.use(
      http.get(CONTENTS_URL, () => {
        return HttpResponse.json({
          path: FILE_PATH,
          sha: "file-sha-456",
          content: Buffer.from("{}").toString("base64"),
          encoding: "base64",
        });
      }),
      // Override PUT to assert sha is forwarded in request body
      http.put(CONTENTS_URL, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body.sha).toBe("file-sha-456");
        return HttpResponse.json({
          commit: { sha: "commit-sha-updated" },
          content: { path: FILE_PATH },
        });
      })
    );

    const svc = new GitService();
    const result = await svc.writeInvitationBranch(INVITATION_ID, SAMPLE_FIELDS);

    expect(result.commitSha).toBe("commit-sha-updated");
  });

  it("handles 422 on createRef (branch already exists) and continues write", async () => {
    // Override: POST /git/refs → 422 (branch already exists)
    server.use(
      http.post(`${BASE}/git/refs`, () => {
        return HttpResponse.json(
          { message: "Reference already exists" },
          { status: 422 }
        );
      })
    );

    // Should NOT throw — must proceed to file write despite the 422
    const svc = new GitService();
    const result = await svc.writeInvitationBranch(INVITATION_ID, SAMPLE_FIELDS);

    expect(result.branch).toBe(BRANCH);
    expect(result.commitSha).toBe("commit-sha-789");
  });
});
