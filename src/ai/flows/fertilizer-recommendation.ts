
'use server';

/**
 * @fileOverview An AI agent for providing fertilizer recommendations based on soil health.
 */

import { ai } from '@/ai/genkit';
import { FertilizerRecommendationInputSchema, FertilizerRecommendationOutputSchema, type FertilizerRecommendationInput, type FertilizerRecommendationOutput } from '@/lib/types';

export async function getFertilizerRecommendations(input: FertilizerRecommendationInput): Promise<FertilizerRecommendationOutput> {
  return fertilizerRecommendationFlow(input);
}

const fertilizerRecommendationPrompt = ai.definePrompt({
    name: 'fertilizerRecommendationPrompt',
    input: { schema: FertilizerRecommendationInputSchema },
    output: { schema: FertilizerRecommendationOutputSchema },
    prompt: `You are an expert soil scientist and agronomist advising an Indian farmer. The user has provided their Soil Health Card data and wants a detailed fertilizer plan for their chosen crop.
Your entire response, including all text fields, MUST be in the specified language: {{{language}}}.

Crop: {{{cropName}}}
Location: {{{location}}}
Language: {{{language}}}

Soil Health Card Data:
- pH: {{{soilHealthCard.ph}}}
- Organic Carbon (%): {{{soilHealthCard.organic_carbon}}}
- Available Nitrogen (N) (kg/ha): {{{soilHealthCard.nitrogen}}}
- Available Phosphorus (P) (kg/ha): {{{soilHealthCard.phosphorus}}}
- Available Potassium (K) (kg/ha): {{{soilHealthCard.potassium}}}

Your Task:
1.  **Calculate NPK Recommendation**: Based on the soil data and the specific needs of the '{{{cropName}}}' crop, calculate the recommended dosage of Nitrogen (N), Phosphorus (P), and Potassium (K) in kg per ACRE. This is the primary nutrient requirement.

2.  **Create TWO Fertilizer Plans**: Generate two separate, complete application schedules to meet the NPK requirement.
    *   **Inorganic Plan**: A schedule using conventional fertilizers.
    *   **Organic Plan**: A schedule using organic inputs.
    *   For each application in both plans, specify:
        *   'applicationStage': A clear, descriptive stage like 'Basal Application (at sowing)' or 'Top Dressing (30 days after sowing)'.
        *   'fertilizerName': e.g., "Urea", "DAP", "MOP" for inorganic; "Vermicompost", "Neem Cake", "Jeevamrut" for organic.
        *   'quantity': The amount to apply per ACRE (e.g., '50 kg' or '2 tonnes'). This MUST be per ACRE.
        *   'applicationMethod': Provide very specific, farmer-friendly instructions. For example, instead of just "Broadcast", say "Broadcast evenly across the field before final ploughing". For liquid fertilizers or sprays, you MUST provide clear mixing instructions like "Mix 5ml in 1 liter of water and spray on the foliage". Be very clear, practical, and specific.

3.  **Recommend Brands**: Suggest 2-3 'recommendedBrands' for conventional fertilizers that are popular and trusted in India (e.g., IFFCO, Kribhco, NFL).

4.  **Provide Subsidy Information**: Briefly mention relevant government 'subsidyInfo' available for conventional fertilizers in India.

5.  **Add Important Notes**: Include any additional 'notes' or precautions applicable to both plans, such as the importance of split application of Nitrogen or adjusting based on visual crop health.

Provide a practical, actionable, and easy-to-understand plan with both organic and inorganic options.`,
});

const fertilizerRecommendationFlow = ai.defineFlow(
  {
    name: 'fertilizerRecommendationFlow',
    inputSchema: FertilizerRecommendationInputSchema,
    outputSchema: FertilizerRecommendationOutputSchema,
  },
  async (input) => {
    const { output } = await fertilizerRecommendationPrompt(input);
    return output!;
  }
);
