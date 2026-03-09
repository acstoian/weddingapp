import { VercelDeploymentService } from "./vercel.service";

/**
 * DeploymentService — abstraction layer over Vercel REST API.
 *
 * All API routes import `getDeploymentService()` and call this interface.
 * Never import VercelDeploymentService directly from call sites.
 * Phase 5 quota monitor can substitute a different implementation by
 * swapping the factory without touching any call sites.
 */
export interface DeploymentService {
  /**
   * Create a new Vercel project for the given invitationId, or retrieve
   * the existing one if it already exists (409 conflict).
   */
  createOrUpdateProject(
    invitationId: string,
    templateBranch: string
  ): Promise<{ projectId: string; url: string }>;

  /**
   * Trigger a new deployment on the given project from a specific branch.
   */
  triggerDeploy(
    projectId: string,
    branch: string
  ): Promise<{ deploymentId: string }>;

  /**
   * Poll the status of an in-progress deployment.
   * Returns 'QUEUED' | 'BUILDING' | 'READY'.
   * Throws on ERROR or CANCELED states.
   * Called in a polling loop by the SSE route (01-07).
   */
  pollStatus(
    deploymentId: string
  ): Promise<"QUEUED" | "BUILDING" | "READY">;

  /**
   * Delete a Vercel project by projectId.
   * Used when an invitation is permanently deleted.
   */
  deleteProject(projectId: string): Promise<void>;
}

/**
 * Factory function — the single entry point for all call sites.
 * Returns a VercelDeploymentService by default.
 */
export function getDeploymentService(): DeploymentService {
  return new VercelDeploymentService();
}
