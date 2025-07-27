
'use server';

/**
 * @fileOverview An autonomous crop recommendation AI agent that suggests crops when none are specified.
 *
 * - getAutonomousCropRecommendations - A function that recommends crops based on farm data using a multi-parameter analysis.
 */

import { ai } from '@/ai/genkit';
import { CropRecommendationInputSchema, CropRecommendationOutputSchema, type CropRecommendationInput, type CropRecommendationOutput } from '@/lib/types';
import { getMandiPrices } from '@/services/datagov';
import { z } from 'zod';

const getMandiPricesTool = ai.defineTool(
  {
    name: 'getMandiPricesForRecommendation',
    description: 'Gets the latest market (mandi) prices for a specific crop in a given state and district to assess economic viability.',
    inputSchema: z.object({
      state: z.string().describe('The state to search for prices in.'),
      district: z.string().describe('The district to search for prices in.'),
      crop: z.string().describe('The crop to get prices for.'),
    }),
    outputSchema: z.array(
      z.object({
        market: z.string(),
        price: z.number(),
      })
    ),
  },
  async input => getMandiPrices(input.state, input.district, input.crop)
);


export async function getAutonomousCropRecommendations(input: CropRecommendationInput): Promise<CropRecommendationOutput> {
  return autonomousCropRecommendationFlow(input);
}

const autonomousCropRecommendationPrompt = ai.definePrompt({
    name: 'autonomousCropRecommendationPrompt',
    input: { schema: CropRecommendationInputSchema },
    output: { schema: CropRecommendationOutputSchema },
    tools: [getMandiPricesTool],
    prompt: `You are an expert agricultural advisor for Indian farmers. The user has not specified a crop, so your task is to act as an autonomous agent and recommend the top 4 most suitable and profitable crops.
Your entire response, including all text fields, MUST be in the specified language: {{{language}}}.

Your decision-making process must follow a strict, weighted scoring system to rank crop candidates.

**Weighted Scoring System:**
-   **Location Fit (25%)**: Analyze agro-climatic zone, historical weather, and regional best practices for '{{{farm.location}}}'.
-   **Soil Type Compatibility (15%)**: The crop must be compatible with '{{{farm.soilType}}}'.
-   **Irrigation Match (15%)**: The crop's water needs must match the available '{{{farm.irrigation}}}'. Do not recommend water-intensive crops like sugarcane for rain-fed farms.
-   **Seasonal Timing (15%)**: Align with the sowing window for '{{{farm.plantingMonth}}}' if provided.
-   **Previous Crop Suitability (10%)**: Consider crop rotation benefits based on '{{{farm.lastCrop}}}' to break pest cycles and manage nutrients.
-   **Market Profitability (10%)**: Use the 'getMandiPricesForRecommendation' tool to assess current local market demand and prices.
-   **Past Performance (10%)**: Leverage your knowledge of KVK trial reports and district-level yield data.

**Your Task:**
1.  **Analyze & Score**: Based on the scoring system, create a ranked list of suitable crops.
2.  **Generate Recommendations**: From your ranked list, provide the top 4 recommendations.
3.  **Identify the "Best Fit"**: The crop with the highest composite score MUST be marked with \`isBestFit: true\`. All other recommendations must have \`isBestFit: false\`.

**Farm Data:**
-   Location: {{{farm.location}}} (This is the PRIMARY factor. Infer state and district for tool calls.)
-   Farm Size: {{{farm.size}}} {{{farm.sizeUnit}}}
-   Soil Type: {{{farm.soilType}}}
-   Irrigation: {{{farm.irrigation}}}
-   Language: {{{language}}}
{{#if farm.plantingMonth}}
-   Intended Planting Month: {{{farm.plantingMonth}}}
{{/if}}
{{#if farm.lastCrop}}
-   Last Crop Grown: {{{farm.lastCrop}}}
{{/if}}

For each of the 4 recommended crops, provide the following detailed information in {{{language}}}:
1.  **Recommendation Details**:
    *   **cropName**: The name of the crop.
    *   **isBestFit**: Set to \`true\` for the single best recommendation, otherwise \`false\`.
    *   **Description**: A short description of the crop.
    *   **Reason**: Justify WHY this crop is a strong fit. You MUST explicitly reference how it scores well against the weighted criteria (location, soil, irrigation, rotation, etc.).
    *   **Sowing Month**: The ideal month to start planting in the {{{farm.location}}} region.
    *   **Estimated Duration**: A specific time from planting to harvest.
    *   **Market Suitability**: Comment on the market demand, referencing the tool's price data if available.

2.  **Crop Overview**:
    *   **bestSeason**: Best season to sow (e.g., Kharif, Rabi).
    *   **harvestDuration**: Typical harvest duration (e.g., '90-120 days').
    *   **recommendedLandType**: Ideal land type.
    *   **seedRate**: Recommended seed rate.
    *   **irrigationNeeds**: Description of irrigation needs.
    *   **estimatedWaterUsage**: Estimated water usage in mm.
    *   **seedTreatment**: Recommended seed treatment.

3.  **Best Sowing Windows**:
    *   Create an array of exactly 3 sowing windows.
    *   For each window, define a 'dateRange', a 'riskLevel' ('Low', 'Medium', or 'High'), 'isPmfbyEligible' (boolean), and a 'description'.
    *   **pmfbyReminder**: A generic reminder to check PMFBY deadlines.

4.  **Action Plan**:
    *   **Land Preparation**: 2-3 key steps.
    *   **Seed Selection**: 2-3 popular and suitable varieties.
    *   **Irrigation Schedule**: Typical frequency and method.
    *   **Spraying Schedule**: Basic schedule, mentioning nutrients needed to replenish soil.
    *   **Timeline**: Simple week-by-week timeline.

5.  **Financial Estimates (Provide precise, data-driven estimates for {{{farm.location}}})**:
    *   **Estimated Costs**: Calculate specific costs per {{{farm.sizeUnit}}} for seeds, fertilizer, pesticides, labor, and irrigation.
    *   **Estimated Yield**: Calculate a specific, realistic yield in kg per {{{farm.sizeUnit}}}.
    *   **Estimated Selling Price**: Provide a precise market selling price in Rupees (Rs) per kg based on recent data for the region (use the tool).`,
});

const autonomousCropRecommendationFlow = ai.defineFlow(
  {
    name: 'autonomousCropRecommendationFlow',
    inputSchema: CropRecommendationInputSchema,
    outputSchema: CropRecommendationOutputSchema,
  },
  async (input) => {
    const { output } = await autonomousCropRecommendationPrompt(input);
    return output!;
  }
);
