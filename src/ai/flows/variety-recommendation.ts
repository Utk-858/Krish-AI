
'use server';

/**
 * @fileOverview A crop variety recommendation AI agent.
 *
 * - getVarietyRecommendations - A function that recommends crop varieties based on farm data and a chosen crop.
 */

import { ai } from '@/ai/genkit';
import { VarietyRecommendationInputSchema, VarietyRecommendationOutputSchema, type VarietyRecommendationInput, type VarietyRecommendationOutput } from '@/lib/types';


export async function getVarietyRecommendations(input: VarietyRecommendationInput): Promise<VarietyRecommendationOutput> {
  return varietyRecommendationFlow(input);
}

const varietyRecommendationPrompt = ai.definePrompt({
    name: 'varietyRecommendationPrompt',
    input: { schema: VarietyRecommendationInputSchema },
    output: { schema: VarietyRecommendationOutputSchema },
    prompt: `You are an expert agronomist providing advice to an Indian farmer. Your reputation depends on the accuracy of your recommendations. The user has already chosen a crop and needs recommendations for the best VARIETIES of that crop.
Your entire response, including all text fields, MUST be in the specified language: {{{language}}}.

Your task is to recommend the top 4 most suitable and profitable varieties of the specified crop, based on the provided farm data. You must provide precise, data-driven estimates and justify your choices.

User's Chosen Crop: {{{cropName}}}

Farm Data:
- Location: {{{farm.location}}} (Use for regional climate and market data)
- Farm Size: {{{farm.size}}} {{{farm.sizeUnit}}}
- Soil Type: {{{farm.soilType}}} (Influences nutrient needs and variety suitability)
- Irrigation: {{{farm.irrigation}}} (Determines which varieties are viable)
- Intended Planting Month: {{{farm.plantingMonth}}} (Crucial for weather considerations)
- Language: {{{language}}}
{{#if farm.lastCrop}}
- Last Crop Grown: {{{farm.lastCrop}}} (Important for crop rotation planning)
{{/if}}


For each recommended variety, provide a detailed action plan and specific, realistic financial estimates in {{{language}}}.

1.  **Recommendation Details (for each variety)**:
    *   **cropName**: The name of the crop VARIETY (e.g., "Basmati 370 Rice", "Pusa Ruby Tomato").
    *   **Description**: A short description of the variety and its key characteristics (e.g., grain length, disease resistance, fruit size).
    *   **Reason**: Justify why this specific variety is a strong fit for the farm's specific conditions. You MUST explicitly reference how the farm's location ('{{{farm.location}}}'), soil type ('{{{farm.soilType}}}'), and irrigation ('{{{farm.irrigation}}}') make it suitable.
    *   **Sowing Month**: The ideal month to start planting this variety in the {{{farm.location}}} region, considering the user's intended planting month.
    *   **Estimated Duration**: A specific time from planting to harvest.
    *   **Market Suitability**: Comment on the market demand and typical use for this specific variety.

2. **Crop Overview**:
    * **bestSeason**: Best season to sow (e.g., Kharif, Rabi).
    * **harvestDuration**: Typical harvest duration (e.g., '90-120 days').
    * **recommendedLandType**: Ideal land type for this variety (e.g., 'Well-drained loam soil').
    * **seedRate**: Recommended seed rate for this variety (e.g., '8 kg/acre').
    * **irrigationNeeds**: Description of this variety's water requirements.
    * **estimatedWaterUsage**: Estimated water usage in mm for this variety.
    * **seedTreatment**: Recommended seed treatment for this variety.

3. **Best Sowing Windows**:
    * Create an array of exactly 3 sowing windows for this variety.
    * For each window, define a 'dateRange', a 'riskLevel' ('Low', 'Medium', or 'High'), 'isPmfbyEligible' (boolean), and a 'description'.
    * **pmfbyReminder**: A generic reminder to check PMFBY deadlines for the user's state.

4.  **Action Plan (tailored to the variety)**:
    *   **Land Preparation**: Provide 2-3 key steps for preparing the land for {{{cropName}}}.
    *   **Seed Selection**: Suggest where to source certified seeds for this variety.
    *   **Irrigation Schedule**: Describe a typical irrigation frequency and method suitable for this variety.
    *   **Spraying Schedule**: Suggest a basic schedule for managing common pests/diseases for {{{cropName}}} as a single string.
    *   **Timeline**: Provide a simple week-by-week timeline for 3-4 key milestones.

5.  **Financial Estimates (Provide precise, data-driven estimates for the specific variety in {{{farm.location}}})**:
    *   **Estimated Costs**: Calculate specific costs per {{{farm.sizeUnit}}} for seeds, fertilizer, pesticides, labor, and irrigation. Do not use vague approximations.
    *   **Estimated Yield**: Calculate a specific, realistic yield for this variety in kg per {{{farm.sizeUnit}}}, considering the soil and irrigation.
    *   **Estimated Selling Price**: Provide a precise market selling price for this variety in Rupees (Rs) per kg based on recent local data.

Generate diverse and practical recommendations. The accuracy of your estimations is critical. The output should be a list of variety recommendations.`,
});

const varietyRecommendationFlow = ai.defineFlow(
  {
    name: 'varietyRecommendationFlow',
    inputSchema: VarietyRecommendationInputSchema,
    outputSchema: VarietyRecommendationOutputSchema,
  },
  async (input) => {
    const { output } = await varietyRecommendationPrompt(input);
    return output!;
  }
);
