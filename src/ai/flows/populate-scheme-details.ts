
'use server';
/**
 * @fileOverview An AI agent to populate details for a specific government scheme.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { schemes } from '@/lib/schemes';

const PopulateSchemeDetailsInputSchema = z.object({
  schemeId: z.string().describe("The unique ID of the scheme to populate."),
  language: z.string().describe("The language for the generated content (e.g., 'en', 'hi').")
});
export type PopulateSchemeDetailsInput = z.infer<typeof PopulateSchemeDetailsInputSchema>;

const PopulateSchemeDetailsOutputSchema = z.object({
  title: z.string().describe("The official title of the scheme in the requested language."),
  description: z.string().describe("A brief, one-sentence description of the scheme's purpose in the requested language."),
  benefits: z.string().describe("A summary of the key benefits provided to the farmer in the requested language."),
  eligibility: z.string().describe("A summary of the key eligibility criteria for a farmer to apply in the requested language."),
  howToApply: z.string().describe("A brief summary of the application process in the requested language."),
  requiredDocuments: z.string().describe("A comma-separated string listing the essential documents required for the application in the requested language."),
});
export type PopulatedSchemeDetailsOutput = z.infer<typeof PopulateSchemeDetailsOutputSchema>;

export async function populateSchemeDetails(input: PopulateSchemeDetailsInput): Promise<PopulatedSchemeDetailsOutput> {
  return populateSchemeDetailsFlow(input);
}

const prompt = ai.definePrompt({
    name: 'populateSchemeDetailsPrompt',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: z.object({ schemeId: z.string(), language: z.string(), website: z.string() }) },
    output: { schema: PopulateSchemeDetailsOutputSchema },
    prompt: `You are Krish-AI, an expert on Indian agricultural schemes. Your job is to generate clear, concise, and farmer-friendly details for a specific government scheme in the requested language.
Your entire response, including all text fields, MUST be in the specified language: {{{language}}}.

You have been given the scheme's ID and official website. Use this information to generate the required fields.

Language: **{{{language}}}**
Scheme ID: **{{{schemeId}}}**
Official Website: **{{{website}}}**

Based on this, generate the following details. Be accurate and concise. For 'requiredDocuments', provide a simple comma-separated list.

Return your answer in the specified JSON format.`,
});

const populateSchemeDetailsFlow = ai.defineFlow(
  {
    name: 'populateSchemeDetailsFlow',
    inputSchema: PopulateSchemeDetailsInputSchema,
    outputSchema: PopulateSchemeDetailsOutputSchema,
  },
  async (input) => {
    console.log("Attempting to populate details for scheme ID:", input.schemeId, "in language:", input.language);
    
    const schemeInfo = schemes.find(s => s.id === input.schemeId);
    if (!schemeInfo) {
      throw new Error(`Scheme with ID ${input.schemeId} not found in local data.`);
    }

    const {output} = await prompt({
        schemeId: input.schemeId,
        language: input.language,
        website: schemeInfo.website,
    });
    
    if (!output) {
      throw new Error("The AI failed to generate details for the scheme.");
    }

    console.log("Successfully generated details for scheme:", input.schemeId, output);
    return output;
  }
);

