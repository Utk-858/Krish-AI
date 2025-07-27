'use server';

/**
 * @fileOverview A voice input processing AI agent for farm details.
 *
 * - processVoiceInput - A function that processes voice input and populates farm details.
 * - VoiceInputForFarmDetailsInput - The input type for the processVoiceInput function.
 * - VoiceInputForFarmDetailsOutput - The return type for the processVoiceInput function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VoiceInputForFarmDetailsInputSchema = z.object({
  voiceInput: z.string().describe('The voice input from the user.'),
  fieldToPopulate: z
    .string()
    .describe('The specific farm detail field to populate with the voice input.'),
});
export type VoiceInputForFarmDetailsInput = z.infer<typeof VoiceInputForFarmDetailsInputSchema>;

const VoiceInputForFarmDetailsOutputSchema = z.object({
  processedValue: z
    .string()
    .describe('The processed value extracted from the voice input.'),
});
export type VoiceInputForFarmDetailsOutput = z.infer<typeof VoiceInputForFarmDetailsOutputSchema>;

export async function processVoiceInput(input: VoiceInputForFarmDetailsInput): Promise<VoiceInputForFarmDetailsOutput> {
  return processVoiceInputFlow(input);
}

const processVoiceInputPrompt = ai.definePrompt({
  name: 'processVoiceInputPrompt',
  input: {schema: VoiceInputForFarmDetailsInputSchema},
  output: {schema: VoiceInputForFarmDetailsOutputSchema},
  prompt: `You are an AI assistant that processes voice input from farmers to populate farm details.

You will receive the voice input and the specific field that needs to be populated.
Your task is to extract the relevant information from the voice input and provide a processed value suitable for that field.

Voice Input: {{{voiceInput}}}
Field to Populate: {{{fieldToPopulate}}}

Extract the value from the voice input that is most appropriate for the field to populate.
If the voice input does not contain the requested information, return an empty string.

Ensure that the processed value is properly formatted for the field (e.g., numbers, dates, units).

Output the processed value only.`,
});

const processVoiceInputFlow = ai.defineFlow(
  {
    name: 'processVoiceInputFlow',
    inputSchema: VoiceInputForFarmDetailsInputSchema,
    outputSchema: VoiceInputForFarmDetailsOutputSchema,
  },
  async input => {
    const {output} = await processVoiceInputPrompt(input);
    return output!;
  }
);
