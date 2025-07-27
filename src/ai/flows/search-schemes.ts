
'use server';
/**
 * @fileOverview An AI agent to find relevant government schemes based on a natural language query.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const SchemeFinderInputSchema = z.object({
  query: z.string().describe("The user's natural language query about their farming needs or situation."),
  schemeIds: z.array(z.string()).describe("A list of all available scheme IDs."),
  language: z.string().describe("The language of the user's query and the scheme titles (e.g., 'en', 'hi').")
});
export type SchemeFinderInput = z.infer<typeof SchemeFinderInputSchema>;

const SchemeFinderOutputSchema = z.object({
  relevantSchemeIds: z
    .array(z.string())
    .describe("An array of IDs of the schemes that are most relevant to the user's query. The order of IDs should be from most relevant to least relevant. Only include IDs from the provided list."),
});
export type SchemeFinderOutput = z.infer<typeof SchemeFinderOutputSchema>;

export async function findRelevantSchemes(input: SchemeFinderInput): Promise<SchemeFinderOutput> {
  return schemeFinderFlow(input);
}

const prompt = ai.definePrompt({
    name: 'schemeFinderPrompt',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: SchemeFinderInputSchema },
    output: { schema: SchemeFinderOutputSchema },
    prompt: `You are Krish-AI, an expert on Indian agricultural schemes. A farmer will describe their situation or ask for help in their local language. Your job is to analyze their query and identify which of the available schemes are most relevant.
Your response MUST be in the specified JSON format.

The language of the query is: **{{{language}}}**.
You should only return IDs from the provided list of available schemes.
Sort the schemes in your response from most relevant to least relevant.
If no schemes are relevant, return an empty array.

**Available Scheme IDs:**
{{#each schemeIds}}
- {{{this}}}
{{/each}}

**Farmer's Query (in {{{language}}}):**
"{{{query}}}"

Return your answer in the specified JSON format.`,
});

const schemeFinderFlow = ai.defineFlow(
  {
    name: 'schemeFinderFlow',
    inputSchema: SchemeFinderInputSchema,
    outputSchema: SchemeFinderOutputSchema,
  },
  async (input) => {
    console.log("Finding relevant schemes for query:", input.query);
    const {output} = await prompt(input);
    console.log("Found relevant scheme IDs:", output?.relevantSchemeIds);
    return output!;
  }
);

