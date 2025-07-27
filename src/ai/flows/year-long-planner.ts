
'use server';

/**
 * @fileOverview Generates a strategic year-long crop rotation plan.
 */

import { ai } from '@/ai/genkit';
import { YearLongPlannerInputSchema, YearLongPlannerOutputSchema, type YearLongPlannerInput, type YearLongPlannerOutput } from '@/lib/types';


export async function getYearLongPlan(input: YearLongPlannerInput): Promise<YearLongPlannerOutput> {
  return yearLongPlannerFlow(input);
}

const yearLongPlannerPrompt = ai.definePrompt({
    name: 'yearLongPlannerPrompt',
    input: { schema: YearLongPlannerInputSchema },
    output: { schema: YearLongPlannerOutputSchema },
    prompt: `You are an expert Indian agronomist with deep knowledge of crop cycles, regional climates, and market economics. Your task is to create a strategic, year-long crop rotation plan for a farmer. The plan should be divided into three seasons: Kharif, Rabi, and Zaid.
Your entire response, including all text fields, MUST be in the specified language: {{{language}}}.

Your recommendations MUST be heavily influenced by the specific farm data provided.

Farmer's Input:
- Location: {{{location}}} (This is the primary driver for climate-based recommendations)
- Start Month: {{{startMonth}}}
- Land Area: {{{landArea}}} {{{landAreaUnit}}}
- Soil Type: {{{soilType}}} (CRITICAL: Certain crops thrive or fail in this soil. Your recommendations must be compatible.)
- Irrigation Systems: {{{irrigation}}} (CRITICAL: This determines which crops are viable. Do not recommend water-intensive crops if only rain-fed irrigation is available.)
- Preferred Crops: {{#if preferredCrops}}{{{preferredCrops}}}{{else}}None{{/if}}
- Language: {{{language}}}

Instructions:
1.  **Analyze the Starting Month**: Determine which season (Kharif, Rabi, Zaid) the '{{{startMonth}}}' falls into and begin your recommendations from that season.
2.  **Generate DIVERSE Recommendations**: For each of the three seasons (Kharif, Rabi, Zaid), provide 2-3 suitable and DIVERSE crop recommendations. Do not just list the user's preferred crops. Include other viable options (pulses, millets, oilseeds, cash crops) that are agronomically sound for the region, soil, and irrigation.
3.  **Prioritize Preferences**: If the user has listed 'preferredCrops', you MUST try to fit them into the appropriate seasons if they are viable.
4.  **Identify the "Best Fit"**: For each season, analyze all your recommendations and mark exactly ONE crop with \`isBestFit: true\`. This choice should be based on the best combination of profitability, suitability to the farm's specific conditions (soil, irrigation), and regional market demand. All other recommendations for that season must have \`isBestFit: false\`.
5.  **Provide Detailed Crop Data**: For each recommended crop, provide:
    *   **cropName**: The name of the crop.
    *   **variety**: Suggest a popular and high-yielding variety suitable for the region.
    *   **duration**: The estimated time from sowing to harvest (e.g., "4-5 months").
    *   **reason**: A detailed justification explaining why this crop is a good choice. You MUST explicitly mention how the '{{{soilType}}}' and '{{{irrigation}}}' systems make this crop a good fit. If a user's preferred crop is NOT suitable, explain why in the 'reason' field of another, better recommendation.
    *   **isBestFit**: Set to \`true\` for the single best recommendation in the season, otherwise \`false\`.
    *   **Financial Estimates (Provide precise, data-driven estimates for {{{location}}})**:
        *   **estimatedCosts**: Calculate specific costs per {{{landAreaUnit}}} for seeds, fertilizer, pesticides, labor, and irrigation.
        *   **estimatedYield**: Calculate a specific, realistic yield in kg per {{{landAreaUnit}}}, considering the soil type and irrigation.
        *   **estimatedSellingPrice**: Provide a precise market selling price in Rupees (Rs) per kg based on recent data for the region.

Your plan must be practical, profitable, and promote sustainable agriculture through intelligent crop rotation. The output must be a valid JSON object matching the provided schema.`,
});

const yearLongPlannerFlow = ai.defineFlow(
  {
    name: 'yearLongPlannerFlow',
    inputSchema: YearLongPlannerInputSchema,
    outputSchema: YearLongPlannerOutputSchema,
  },
  async (input) => {
    const { output } = await yearLongPlannerPrompt(input);
    return output!;
  }
);
