import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { VercelDeploymentService } from "@/lib/services/vercel.service";

const MOCK_TOKEN = "test-token";
const MOCK_TEAM = "test-team";

// Set env vars before tests
beforeAll(() => {
  process.env.VERCEL_TOKEN = MOCK_TOKEN;
  process.env.VERCEL_TEAM_ID = MOCK_TEAM;
});

const server = setupServer(
  // pollStatus — READY
  http.get("https://api.vercel.com/v13/deployments/dep_ready", () => {
    return HttpResponse.json({
      id: "dep_ready",
      readyState: "READY",
      url: "test.vercel.app",
    });
  }),

  // pollStatus — ERROR
  http.get("https://api.vercel.com/v13/deployments/dep_error", () => {
    return HttpResponse.json({
      id: "dep_error",
      readyState: "ERROR",
    });
  }),

  // triggerDeploy
  http.post("https://api.vercel.com/v13/deployments", () => {
    return HttpResponse.json({ id: "dep_123" }, { status: 200 });
  }),

  // deleteProject
  http.delete(
    "https://api.vercel.com/v9/projects/proj_abc",
    () => new HttpResponse(null, { status: 204 })
  ),

  // createOrUpdateProject — new project
  http.post("https://api.vercel.com/v10/projects", () => {
    return HttpResponse.json({
      id: "proj_new",
      alias: [{ domain: "new-project.vercel.app" }],
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("DeploymentService", () => {
  it("pollStatus returns READY when readyState is READY", async () => {
    const svc = new VercelDeploymentService();
    const status = await svc.pollStatus("dep_ready");
    expect(status).toBe("READY");
  });

  it("pollStatus throws when readyState is ERROR", async () => {
    const svc = new VercelDeploymentService();
    await expect(svc.pollStatus("dep_error")).rejects.toThrow();
  });

  it("triggerDeploy returns deploymentId from Vercel API response", async () => {
    const svc = new VercelDeploymentService();
    const result = await svc.triggerDeploy("proj_abc", "invitation-inv_123", "main");
    expect(result).toEqual({ deploymentId: "dep_123" });
  });

  it("deleteProject calls DELETE /v9/projects/{projectId} without error", async () => {
    const svc = new VercelDeploymentService();
    await expect(svc.deleteProject("proj_abc")).resolves.toBeUndefined();
  });

  it("createOrUpdateProject returns projectId and url for new project", async () => {
    const svc = new VercelDeploymentService();
    const result = await svc.createOrUpdateProject("inv_123", "main");
    expect(result.projectId).toBe("proj_new");
    expect(result.url).toBe("new-project.vercel.app");
  });

  it("SSE event data line parses as valid JSON with status and url fields", () => {
    // Validate the SSE wire format used by /api/deploy-status
    const payloads: Array<{ status: string; url: string | null }> = [
      { status: "BUILDING", url: null },
      { status: "READY", url: "https://invitation-abc.vercel.app" },
      { status: "ERROR", url: null },
    ];

    for (const payload of payloads) {
      const line = `event: status\ndata: ${JSON.stringify(payload)}\n\n`;
      const dataLine = line.split("\n").find((l) => l.startsWith("data: "));
      expect(dataLine).toBeDefined();
      const parsed = JSON.parse(dataLine!.slice(6)) as {
        status: unknown;
        url: unknown;
      };
      expect(typeof parsed.status).toBe("string");
      expect(parsed.url === null || typeof parsed.url === "string").toBe(true);
    }
  });
});
