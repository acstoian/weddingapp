import { Octokit } from "@octokit/rest";
import type { InvitationFields } from "@/lib/templates/schema";

const OWNER = process.env.GITHUB_OWNER ?? "acstoian";
const REPO = process.env.GITHUB_REPO ?? "weddingapp";
const BASE_BRANCH = "main";

export interface GitWriteResult {
  /** e.g. 'invitation/abc-123' */
  branch: string;
  /** SHA of the commit written to GitHub */
  commitSha: string;
  /** e.g. 'invitations/abc-123/invitation-config.json' */
  filePath: string;
}

/**
 * GitService — GitHub branch automation via Octokit.
 *
 * Implements the write step in the publish pipeline:
 *   editor → git write (this service) → Vercel deploy (01-07)
 *
 * Safe upsert pattern:
 *   - Creates branch from main SHA if it doesn't exist (422 = already exists, ignored)
 *   - Fetches current file SHA before update to avoid 422 on existing files
 *   - Omits SHA for first-time file writes
 */
export class GitService {
  private octokit = new Octokit({ auth: process.env.GITHUB_PAT });

  async writeInvitationBranch(
    invitationId: string,
    fields: InvitationFields
  ): Promise<GitWriteResult> {
    const branch = `invitation/${invitationId}`;
    const filePath = `invitations/${invitationId}/invitation-config.json`;
    const content = Buffer.from(JSON.stringify(fields, null, 2)).toString(
      "base64"
    );

    // Step 1: Get main branch SHA
    const { data: refData } = await this.octokit.git.getRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${BASE_BRANCH}`,
    });
    const baseSha = refData.object.sha;

    // Step 2: Create branch (ignore 422 if already exists)
    try {
      await this.octokit.git.createRef({
        owner: OWNER,
        repo: REPO,
        ref: `refs/heads/${branch}`,
        sha: baseSha,
      });
    } catch (e: unknown) {
      const err = e as { status?: number };
      if (err.status !== 422) throw e; // 422 = branch already exists, continue
    }

    // Step 3: Safe upsert — check if file exists to get its SHA
    let existingFileSha: string | undefined;
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: filePath,
        ref: branch,
      });
      if (!Array.isArray(data)) existingFileSha = data.sha;
    } catch (e: unknown) {
      const err = e as { status?: number };
      if (err.status !== 404) throw e; // 404 = file doesn't exist yet, OK
    }

    // Step 4: Write file (with sha for update, without for create)
    const { data: commitData } = await this.octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      message: `chore: publish invitation ${invitationId}`,
      content,
      branch,
      ...(existingFileSha ? { sha: existingFileSha } : {}),
    });

    return {
      branch,
      commitSha: commitData.commit.sha as string,
      filePath,
    };
  }
}

export const gitService = new GitService();
