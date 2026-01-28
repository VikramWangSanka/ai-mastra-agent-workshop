import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { parseGitHubUrl } from "../../mastra/helpers";
import { githubClient } from "../../mastra/github-client";
import { handleGitHubResponse } from "../../mastra/error-handler";
import { GitHubPullRequest } from "../../mastra/types";

export const getPullRequest = createTool({
  id: "get-pull-request",
  inputSchema: z.object({
    pullRequestUrl: z.string(),
  }),
  description: `Fetches a GitHub pull request by URL. Use this to get PR details and state.`,
  execute: async ({ pullRequestUrl }) => {
    const { apiBase, number } = parseGitHubUrl(pullRequestUrl);
    const apiUrl = `${apiBase}/pulls/${number}`;

    const response = await githubClient.get<GitHubPullRequest>(apiUrl);
    const data = handleGitHubResponse(response, "fetch pull request");

    return {
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state,
      merged: data.merged,
    };
  },
});
