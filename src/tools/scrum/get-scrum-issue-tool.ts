import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const getScrumIssue = createTool({
  id: "get-scrum-issue",
  inputSchema: z.object({
    issueId: z.string(),
  }),
  description: `Fetches a scrum issue by ID from the scrum board. Use this when an issue ID is mentioned in commit title or description of a pull request.`,
  execute: async ({ issueId }) => {
    const apiUrl = `https://scrum-board-navy.vercel.app/api/tickets/${issueId}`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Failed to fetch scrum issue: ${response.status} ${text}. On ${apiUrl}`,
      );
    }
    const data = await response.json();
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
});
