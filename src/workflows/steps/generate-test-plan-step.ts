import { z } from "zod";
import { createStep } from "@mastra/core/workflows";
import { testplanAgent } from "../../agents/testplan-agent";

export const testPlanOutputSchema = z.object({
  needsTesting: z.boolean(),
  testCases: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
});

export const generateTestPlanStep = createStep({
  id: "generate-testplan",
  inputSchema: z.object({ pullRequestUrl: z.string() }),
  outputSchema: testPlanOutputSchema,

  execute: async (context) => {
    const response = await testplanAgent.generate(
      context.inputData.pullRequestUrl,
      { structuredOutput: { schema: testPlanOutputSchema } }
    );

    if (!response.object) {
      throw new Error("Failed to generate test plan");
    }

    return response.object;
  },
});
