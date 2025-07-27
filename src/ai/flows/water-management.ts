
'use server';
/**
 * @fileOverview An AI agent for providing tailored water management plans.
 * 
 * - getWaterManagementPlan - A function that returns a detailed irrigation plan.
 */

import { ai } from '@/ai/genkit';
import { WaterManagementInputSchema, WaterManagementOutputSchema, type WaterManagementInput, type WaterManagementOutput } from '@/lib/types';

export async function getWaterManagementPlan(input: WaterManagementInput): Promise<WaterManagementOutput> {
    return waterManagementFlow(input);
}

const waterManagementPrompt = ai.definePrompt({
    name: 'waterManagementPrompt',
    input: { schema: WaterManagementInputSchema },
    output: { schema: WaterManagementOutputSchema },
    prompt: `You are an expert irrigation and water management advisor for Indian farmers. Your reputation depends on providing precise, actionable advice. Your task is to create a practical, easy-to-understand water management plan based on the provided farm data.
Your entire response, including all text fields, MUST be in the specified language: {{{language}}}.

Farm & Crop Data:
- Crop: {{{cropName}}}
- Location: {{{farm.location}}} (Use this for regional climate and rainfall patterns)
- Farm Size: {{{farm.size}}} {{{farm.sizeUnit}}}
- Soil Type: {{{farm.soilType}}} (This is CRITICAL for determining water retention and frequency)
- Available Irrigation Sources: {{{farm.irrigation}}}
- Language: {{{language}}}

Instructions:
1.  **Analyze Irrigation Sources**: The 'farm.irrigation' field may contain multiple sources (e.g., "Borewell, Canal, Rain-fed"). You MUST generate a separate, detailed plan for each primary mechanical/manual source listed (e.g., Borewell, Canal).
2.  **Integrate Rain-fed**: If 'Rain-fed' is mentioned along with another source, you MUST combine them into a single plan (e.g., "Canal/Rain-fed Source"). Your advice and schedule should explain how to use the canal water in conjunction with rainfall. Do NOT create a separate plan for "Rain-fed" if another primary source is available.
3.  **Create a Plan for Each Source**: For each irrigation plan, provide the following:
    *   **source**: The name of the irrigation source (e.g., "Borewell Source", "Canal/Rain-fed Source").
    *   **advice**: A detailed paragraph of practical advice for using this specific source for the '{{{cropName}}}' in '{{{farm.location}}}'. Mention water-saving techniques like drip, sprinkler, or alternate wetting and drying (AWD) if applicable. Factor in the '{{{farm.soilType}}}' for advice on water loss.
    *   **schedule**: A table-like schedule with at least 3-4 key growth stages. For each stage:
        *   **growthStage**: The name of the stage (e.g., "Initial Stage (0-20 days)", "Tillering Stage", "Flowering Stage").
        *   **frequency**: How often irrigation is needed (e.g., "Every 8-10 days"). Be specific based on soil type and crop stage.
        *   **duration**: THIS IS CRITICAL. Convert technical water volume into a simple, practical instruction for a farmer. Instead of assuming a pump type or using vague terms, you MUST specify the required water depth. For example, instead of "run pump for 2 hours", say "Apply water until it reaches a depth of 3-4 inches across the field" or "Ensure the soil is moist up to a depth of 6 inches". Be specific and practical.

4.  **Farmer-Friendly Language**: Use clear, simple language. Avoid overly technical jargon. The goal is to create a plan a farmer can immediately understand and implement. Your estimations must be accurate and trustworthy.`,
});

const waterManagementFlow = ai.defineFlow(
  {
    name: 'waterManagementFlow',
    inputSchema: WaterManagementInputSchema,
    outputSchema: WaterManagementOutputSchema,
  },
  async (input) => {
    const { output } = await waterManagementPrompt(input);
    return output!;
  }
);
