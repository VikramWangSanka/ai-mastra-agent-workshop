import { z } from "zod";
import { createStep } from "@mastra/core/workflows";
import { parseGitHubUrl } from "../../mastra/helpers";
import { githubClient } from "../../mastra/github-client";
import { GitHubComment } from "../../mastra/types";

export const previewEnvironmentOutputSchema = z.object({
  previewUrl: z.string().url(),
  deploymentStatus: z.string(),
});

export const waitForPreviewEnvironmentStep = createStep({
  id: "wait-for-preview-environment",
  inputSchema: z.object({ success: z.boolean() }),
  outputSchema: previewEnvironmentOutputSchema,

  execute: async (context) => {
    // Get the pull request URL from the initial workflow data
    const { pullRequestUrl } = context.getInitData() as { pullRequestUrl: string };
    const { apiBase, number } = parseGitHubUrl(pullRequestUrl);
    const commentsUrl = `${apiBase}/issues/${number}/comments`;

    console.log(`Waiting for preview environment...`);
    console.log(`Polling comments at: ${commentsUrl}`);

    const maxWaitTime = 2 * 60 * 1000; // 2 minutes in milliseconds
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();

    // Get GitHub token if available
    const token = process.env.GITHUB_TOKEN;

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await githubClient.get<GitHubComment[]>(
          commentsUrl,
          token
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const comments = response.data;

        // Look for Vercel bot comments containing preview URLs
        for (const comment of comments) {
          if (comment.user?.login === "vercel[bot]" && comment.body) {
            console.log(
              `Found Vercel bot comment: ${comment.body.substring(0, 200)}...`
            );

            // Extract preview URL from the comment body
            // Look for Vercel preview URLs in the format [Preview](https://...)
            const previewUrlMatch =
              comment.body.match(/\[Preview\]\((https:\/\/[^)]+)\)/) ||
              comment.body.match(/(https:\/\/[^.\s]+\.vercel\.app[^\s\)]*)/i);

            if (previewUrlMatch) {
              const previewUrl = previewUrlMatch[1];
              console.log(`Preview environment ready: ${previewUrl}`);

              return {
                previewUrl,
                deploymentStatus: "ready",
              };
            }
          }
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        console.log(
          `No preview environment yet, waiting ${pollInterval / 1000}s...`
        );
      } catch (error) {
        console.error(`Error polling GitHub comments:`, error);
        // Continue polling even if there's an error
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error("Preview environment not ready within 2 minutes");
  },
});
