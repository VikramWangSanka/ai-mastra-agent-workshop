import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { parseGitHubUrl } from "../../mastra/helpers";
import { githubClient } from "../../mastra/github-client";
import { handleGitHubResponse } from "../../mastra/error-handler";
import { GitHubComment } from "../../mastra/types";

export const getPullRequestComments = createTool({
  id: "get-pull-request-comments",
  inputSchema: z.object({
    pullRequestUrl: z.string(),
  }),
  description: `Fetches comments from a GitHub pull request. Useful for understanding discussion and requirements.`,
  execute: async ({ pullRequestUrl }) => {
    const { apiBase, number } = parseGitHubUrl(pullRequestUrl);
    const apiUrl = `${apiBase}/issues/${number}/comments`;

    const response = await githubClient.get<GitHubComment[]>(apiUrl);
    const data = handleGitHubResponse(response, "fetch PR comments");

    return {
      pullRequestUrl,
      comments: data.map((comment) => ({
        id: comment.id,
        body: comment.body,
        user: comment.user.login,
        createdAt: comment.created_at,
        path: comment.path,
        line: comment.line,
      })),
    };
  },
});
