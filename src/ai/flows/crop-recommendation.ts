
'use server';

/**
 * @fileOverview A crop recommendation AI agent.
 *
 * - getCropRecommendations - A function that recommends crops based on farm data.
 */

import { ai } from '@/ai/genkit';
import { CropRecommendationInputSchema, CropRecommendationOutputSchema, type CropRecommendationInput, type CropRecommendationOutput } from '@/lib/types';


export async function getCropRecommendations(input: CropRecommendationInput): Promise<CropRecommendationOutput> {
  return cropRecommendationFlow(input);
}

const cropRecommendationPrompt = ai.definePrompt({
    name: 'cropRecommendationPrompt',
    input: { schema: CropRecommendationInputSchema },
    output: { schema: CropRecommendationOutputSchema },
    prompt: `You are an expert agricultural advisor for Indian farmers whose reputation depends on providing accurate, data-driven advice. Based on the provided farm data, recommend the top 4 most suitable and profitable crops. Personalize the recommendations for the farm's specific conditions.

Farm Data:
- Location: {{{farm.location}}} (Use this for region-specific data)
- Farm Size: {{{farm.size}}} {{{farm.sizeUnit}}}
- Soil Type: {{{farm.soilType}}} (This heavily influences suitability and nutrient needs)
- Irrigation: {{{farm.irrigation}}} (This determines which crops are viable)
{{#if farm.lastCrop}}
- Last Crop Grown: {{{farm.lastCrop}}} (CRITICAL for crop rotation, pest cycles, and nutrient planning)
{{/if}}

For each recommended crop, provide a detailed action plan and precise, location-specific financial estimates. Your calculations must be realistic and reflect local market conditions.

1.  **Recommendation Details**:
    *   **cropName**: The name of the recommended crop.
    *   **Description**: A short description of the crop.
    *   **Reason**: Justify why this crop is a strong fit for the farm's specific characteristics (soil, irrigation, location) and how it fits into a rotation with '{{{farm.lastCrop}}}'.
    *   **Sowing Month**: The ideal month to start planting in the {{{farm.location}}} region.
    *   **Estimated Duration**: A specific time from planting to harvest (e.g., "110-120 days").
    *   **Market Suitability**: Comment on the market demand and typical price stability for this crop in the region.

2. **Crop Overview**:
    * **bestSeason**: Best season to sow (e.g., Kharif, Rabi).
    * **harvestDuration**: Typical harvest duration (e.g., '90-120 days').
    * **recommendedLandType**: Ideal land type (e.g., 'Well-drained loam soil').
    * **seedRate**: Recommended seed rate (e.g., '20-25 kg/acre').
    * **irrigationNeeds**: Description of irrigation needs.
    * **estimatedWaterUsage**: Estimated water usage in mm.
    * **seedTreatment**: Recommended seed treatment.

3. **Best Sowing Windows**:
    * Create an array of exactly 3 sowing windows.
    * For each window, define a 'dateRange', a 'riskLevel' ('Low', 'Medium', or 'High'), 'isPmfbyEligible' (boolean), and a 'description'.
    * **pmfbyReminder**: A generic reminder to check PMFBY deadlines for the user's state.

4.  **Action Plan**:
    *   **Land Preparation**: Provide 2-3 key steps for preparing the land.
    *   **Seed Selection**: Suggest 2-3 popular and suitable varieties (local or hybrid).
    *   **Irrigation Schedule**: Describe a typical irrigation frequency and method.
    *   **Spraying Schedule**: Suggest a basic schedule for organic/inorganic sprays as a single string. Mention specific nutrients needed to replenish the soil after '{{{farm.lastCrop}}}'.
    *   **Timeline**: Provide a simple week-by-week timeline for 3-4 key milestones (e.g., Week 1: Sowing, Week 4-6: Fertilizing, etc.).

5.  **Financial Estimates (Provide precise, data-driven estimates for {{{farm.location}}})**:
    *   **Estimated Costs**: Calculate specific costs per {{{farm.sizeUnit}}} for seeds, fertilizer, pesticides, labor, and irrigation. Do not use vague approximations.
    *   **Estimated Yield**: Calculate a specific, realistic yield in kg per {{{farm.sizeUnit}}}, considering the soil type and irrigation.
    *   **Estimated Selling Price**: Provide a precise market selling price in Rupees (Rs) per kg based on recent data for the region.

Generate diverse and practical recommendations. The accuracy of your estimations is critical.`,
});

const cropRecommendationFlow = ai.defineFlow(
  {
    name: 'cropRecommendationFlow',
    inputSchema: CropRecommendationInputSchema,
    outputSchema: CropRecommendationOutputSchema,
  },
  async (input) => {
    const { output } = await cropRecommendationPrompt(input);
    return output!;
  }
);
