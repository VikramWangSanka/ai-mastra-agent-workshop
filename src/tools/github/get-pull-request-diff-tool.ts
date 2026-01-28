import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { parseGitHubUrl } from "../../mastra/helpers";
import { githubClient } from "../../mastra/github-client";
import { handleGitHubResponse } from "../../mastra/error-handler";
import { GitHubFile } from "../../mastra/types";

export const getPullRequestDiff = createTool({
  id: "get-pull-request-diff",
  inputSchema: z.object({
    pullRequestUrl: z.string(),
  }),
  description: `Fetches the file changes (diff) from a GitHub pull request URL`,
  execute: async ({ pullRequestUrl }) => {
    const { apiBase, number } = parseGitHubUrl(pullRequestUrl);
    const apiUrl = `${apiBase}/pulls/${number}/files`;

    const response = await githubClient.get<GitHubFile[]>(apiUrl);
    const data = handleGitHubResponse(response, "fetch PR diff");

    return {
      pullRequestUrl,
      files: data.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
      })),
    };
  },
});
