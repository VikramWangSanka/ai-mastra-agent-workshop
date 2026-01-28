import { z } from "zod";
import { createStep } from "@mastra/core/workflows";
import { generateTestPlanStep } from "./generate-test-plan-step";
import { previewEnvironmentOutputSchema } from "./wait-for-preview-environment-step";
import { BrowserUseClient } from "browser-use-sdk";

export const testExecutionOutputSchema = z.object({
  needsTesting: z.boolean(),
  testCases: z.array(
    z.object({
      title: z.string(),
      status: z.enum(["success", "fail"]),
      resultDescription: z.string().optional(),
    }),
  ),
});

export const executeTestsStep = createStep({
  id: "execute-tests",
  inputSchema: previewEnvironmentOutputSchema,
  outputSchema: testExecutionOutputSchema,

  execute: async (context) => {
    const testPlanResult = context.getStepResult(generateTestPlanStep);

    if (!testPlanResult) {
      throw new Error("Test plan step result not found");
    }

    const { testCases, needsTesting } = testPlanResult;

    if (!needsTesting) {
      return {
        needsTesting: false,
        testCases: [],
      };
    }

    const client = new BrowserUseClient({
      apiKey: process.env.BROWSER_USE_API_KEY!,
    });

    const executedTestCases = await Promise.all(
      testCases.map(async (testCase) => {
        try {
          const task = await client.tasks.createTask({
            task: `Navigate to ${context.inputData.previewUrl} and execute this test case: ${testCase.title}. ${testCase.description}`,
          });

          // Wait for task completion using the new SDK API
          const result = await task.complete();

          console.log(`Task completed with output: ${result.output}`);

          // Determine if the test passed based on the result
          const status = result.isSuccess === true ? "success" : "fail";
          return {
            title: testCase.title,
            status: status as "success" | "fail",
            resultDescription: result.output ?? undefined,
          };
        } catch (error) {
          console.error(`Test case "${testCase.title}" failed:`, error);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          return {
            title: testCase.title,
            status: "fail" as const,
            resultDescription: `Error: ${errorMessage}`,
          };
        }
      }),
    );

    return {
      needsTesting: true,
      testCases: executedTestCases,
    };
  },
});
