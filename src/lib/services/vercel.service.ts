import type { DeploymentService } from "./deployment.service";

const VERCEL_API = "https://api.vercel.com";

type VercelReadyState =
  | "QUEUED"
  | "BUILDING"
  | "INITIALIZING"
  | "READY"
  | "ERROR"
  | "CANCELED";

/**
 * VercelDeploymentService — concrete implementation of DeploymentService
 * using the Vercel REST API v10/v13.
 *
 * Reads VERCEL_TOKEN and VERCEL_TEAM_ID from environment variables.
 * Never import this class directly from API routes — use getDeploymentService().
 */
export class VercelDeploymentService implements DeploymentService {
  private get token(): string {
    return process.env.VERCEL_TOKEN ?? "";
  }

  private get teamId(): string {
    return process.env.VERCEL_TEAM_ID ?? "";
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Create a Vercel project for the invitation.
   * If the project already exists (409), GET the existing project.
   */
  async createOrUpdateProject(
    invitationId: string,
    _templateBranch: string
  ): Promise<{ projectId: string; url: string }> {
    const projectName = `invitation-${invitationId}`;

    const createUrl = new URL(`${VERCEL_API}/v10/projects`);
    if (this.teamId) createUrl.searchParams.set("teamId", this.teamId);

    const res = await fetch(createUrl.toString(), {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({
        name: projectName,
        gitRepository: {
          type: "github",
          repo: "acstoian/weddingapp",
        },
      }),
    });

    if (res.status === 409) {
      // Project already exists — retrieve it
      const getRes = await fetch(
        `${VERCEL_API}/v9/projects/${encodeURIComponent(projectName)}`,
        { headers: this.authHeaders() }
      );
      if (!getRes.ok) {
        throw new Error(
          `Failed to GET existing project ${projectName}: ${getRes.status}`
        );
      }
      const data = (await getRes.json()) as {
        id: string;
        alias?: Array<{ domain: string }>;
      };
      return {
        projectId: data.id,
        url: data.alias?.[0]?.domain ?? "",
      };
    }

    if (!res.ok) {
      throw new Error(`Failed to create project: ${res.status}`);
    }

    const data = (await res.json()) as {
      id: string;
      alias?: Array<{ domain: string }>;
    };
    return {
      projectId: data.id,
      url: data.alias?.[0]?.domain ?? "",
    };
  }

  /**
   * Trigger a new deployment on Vercel from a GitHub branch.
   */
  async triggerDeploy(
    _projectId: string,
    projectName: string,
    branch: string
  ): Promise<{ deploymentId: string }> {
    const url = new URL(`${VERCEL_API}/v13/deployments`);
    if (this.teamId) url.searchParams.set("teamId", this.teamId);
    url.searchParams.set("skipAutoDetectionConfirmation", "1");

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({
        name: projectName,
        gitSource: {
          type: "github",
          org: "acstoian",
          repo: "weddingapp",
          ref: branch,
        },
        target: "production",
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "(no body)");
      throw new Error(`Failed to trigger deploy: ${res.status} ${body}`);
    }

    const data = (await res.json()) as { id: string };
    return { deploymentId: data.id };
  }

  /**
   * Poll Vercel for the current deployment status.
   * Maps Vercel readyState to simplified status values.
   * Throws on ERROR or CANCELED.
   */
  async pollStatus(
    deploymentId: string
  ): Promise<"QUEUED" | "BUILDING" | "READY"> {
    const res = await fetch(
      `${VERCEL_API}/v13/deployments/${encodeURIComponent(deploymentId)}`,
      { headers: this.authHeaders() }
    );

    if (!res.ok) {
      throw new Error(`Failed to poll deployment ${deploymentId}: ${res.status}`);
    }

    const data = (await res.json()) as { readyState: VercelReadyState };
    const state = data.readyState;

    switch (state) {
      case "QUEUED":
      case "INITIALIZING":
        return "QUEUED";
      case "BUILDING":
        return "BUILDING";
      case "READY":
        return "READY";
      case "ERROR":
      case "CANCELED":
        throw new Error(`Deployment ${deploymentId} ended with state: ${state}`);
      default:
        throw new Error(`Unknown Vercel readyState: ${state}`);
    }
  }

  /**
   * Delete a Vercel project permanently.
   */
  async deleteProject(projectId: string): Promise<void> {
    const res = await fetch(
      `${VERCEL_API}/v9/projects/${encodeURIComponent(projectId)}`,
      {
        method: "DELETE",
        headers: this.authHeaders(),
      }
    );

    if (!res.ok && res.status !== 204 && res.status !== 404) {
      throw new Error(`Failed to delete project ${projectId}: ${res.status}`);
    }
  }
}
