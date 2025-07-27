'use server';

/**
 * @fileOverview An AI agent that analyzes voice input and routes the user to the appropriate section of the app.
 *
 * - analyzeVoiceInputAndRoute - A function that analyzes voice input and returns the navigation path and language.
 * - AnalyzeVoiceInputAndRouteInput - The input type for the analyzeVoiceInputAndRoute function.
 * - AnalyzeVoiceInputAndRouteOutput - The return type for the analyzeVoiceInputAndRoute function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeVoiceInputAndRouteInputSchema = z.object({
  voiceInput: z.string().describe('The voice input from the user.'),
  currentPath: z.string().describe('The current path of the user in the app.'),
  language: z.string().describe('The language of the voice input (e.g., "en", "hi").'),
});
export type AnalyzeVoiceInputAndRouteInput = z.infer<typeof AnalyzeVoiceInputAndRouteInputSchema>;

const AnalyzeVoiceInputAndRouteOutputSchema = z.object({
  navigationPath: z.string().describe("The path to navigate the user to. Must be one of the valid paths provided."),
});
export type AnalyzeVoiceInputAndRouteOutput = z.infer<typeof AnalyzeVoiceInputAndRouteOutputSchema>;

export async function analyzeVoiceInputAndRoute(
  input: AnalyzeVoiceInputAndRouteInput
): Promise<AnalyzeVoiceInputAndRouteOutput> {
  console.log('AI FLOW: Received input for context-aware navigation:', input);
  const result = await analyzeVoiceInputAndRouteFlow(input);
  console.log('AI FLOW: Sending output from context-aware navigation:', result);
  return result;
}

const analyzeVoiceInputAndRoutePrompt = ai.definePrompt({
  name: 'analyzeVoiceInputAndRoutePrompt',
  input: { schema: AnalyzeVoiceInputAndRouteInputSchema },
  output: { schema: AnalyzeVoiceInputAndRouteOutputSchema },
  prompt: `You are a master router for a farming application. Your primary job is to determine the correct application path based on the user's voice command, which will be in the specified language.

**Instructions:**
1.  **Analyze the User's Command**: Here is the user's command in **{{{language}}}**: "{{{voiceInput}}}"
2.  **Choose the Best Route**: Based on the user's intent, select the most appropriate path from the list below. The command may not be an exact match, so you must infer the user's goal.

**Available Routes and Their Purpose:**
*   '/my-farms': Main dashboard, farm overview, viewing your farms ("मेरे खेत").
*   '/crop-planner': For planning future crops, getting recommendations, variety suggestions ("फसल योजना").
*   '/disease-diagnosis': For identifying problems with current crops, diseases, pests ("रोग निदान," "फसल खराब है").
*   '/market-insights': For market prices, sell/wait advice, mandi rates ("बाजार भाव").
*   '/schemes': For government schemes, subsidies, financial help ("सरकारी योजनाएं").
*   '/community': For community posts, asking questions to other farmers ("समुदाय").
*   '/notifications': For alerts, especially price alerts ("सूचनाएं").
*   '/profile-setup': For changing user details, settings ("प्रोफ़ाइल").

**Rules:**
*   You **MUST** select one of the paths from the list above.
*   If the user's intent is unclear or does not match any of the routes, you **MUST** default to '/my-farms'.
*   Even if the user is already on the correct page (e.g., currentPath is '/my-farms' and they say "show my farms"), you still must return the matched path '/my-farms'.

Do not provide any explanation or reasoning. Return only the final JSON object.`,
});

const analyzeVoiceInputAndRouteFlow = ai.defineFlow(
  {
    name: 'analyzeVoiceInputAndRouteFlow',
    inputSchema: AnalyzeVoiceInputAndRouteInputSchema,
    outputSchema: AnalyzeVoiceInputAndRouteOutputSchema,
  },
  async input => {
    try {
      const { output } = await analyzeVoiceInputAndRoutePrompt(input);
      if (output && output.navigationPath) {
        return output;
      }
      console.warn('AI did not return a valid navigation path. Defaulting to /my-farms.');
      return { navigationPath: '/my-farms' };
    } catch (error) {
      console.error('Error in analyzeVoiceInputAndRouteFlow:', error);
      // On error, gracefully fail by defaulting to /my-farms
      return { navigationPath: '/my-farms' };
    }
  }
);
