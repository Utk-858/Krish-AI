
'use server';

/**
 * @fileOverview Generates a detailed, year-long crop calendar and nutrient plan based on user's seasonal crop selections.
 */

import { ai } from '@/ai/genkit';
import { YearLongVarietyPlanInputSchema, YearLongVarietyPlanOutputSchema, type YearLongVarietyPlanInput, type YearLongVarietyPlanOutput } from '@/lib/types';


export async function getYearLongVarietyPlan(input: YearLongVarietyPlanInput): Promise<YearLongVarietyPlanOutput> {
  return yearLongVarietyPlanFlow(input);
}

const yearLongVarietyPlanPrompt = ai.definePrompt({
    name: 'yearLongVarietyPlanPrompt',
    input: { schema: YearLongVarietyPlanInputSchema },
    output: { schema: YearLongVarietyPlanOutputSchema },
    prompt: `You are a world-class agronomist tasked with creating a comprehensive, year-long crop and nutrient management calendar for an Indian farmer. The user has already selected their crop rotation for the year. Your job is to provide a detailed, actionable plan for each crop in the cycle.
Your entire response, including all text fields, MUST be in the specified language: {{{language}}}.

Farmer's Farm Data:
- Location: {{{farm.location}}}
- Land Area: {{{farm.landArea}}} {{{farm.landAreaUnit}}}
- Soil Type: {{{farm.soilType}}}
- Irrigation Systems: {{{farm.irrigation}}}
- Language: {{{language}}}

User's Chosen Crop Cycle:
{{#each cropCycle}}
- {{season}}: {{cropName}} (Variety: {{variety}})
{{/each}}

Instructions:
For EACH crop in the user's chosen cycle, you must generate a complete plan in {{{language}}}.

1.  **Monthly Activity Timeline**:
    *   Create a detailed 'monthlyTimeline' from sowing to harvest.
    *   For each month, specify the key 'activity' required (e.g., "Final land preparation and sowing", "First top dressing of fertilizer", "Pest monitoring and first spray", "Harvesting and field clearing").

2.  **Fertilizer & Nutrient Plan**:
    *   Create a detailed 'fertilizerPlan' with TWO separate schedules: one 'inorganic' and one 'organic'.
    *   For EACH schedule (inorganic and organic), provide a list of applications.
    *   For each application, specify:
        *   'applicationStage': A clear, descriptive stage like 'Basal Application (at sowing)' or 'Top Dressing (30 days after sowing)'.
        *   'fertilizerName': e.g., "Urea", "DAP", "MOP" for inorganic; "Vermicompost", "Neem Cake", "Jeevamrut" for organic.
        *   'quantity': The amount to apply per ACRE (e.g., '50 kg' or '2 tonnes'). This MUST be per ACRE.
        *   'applicationMethod': Provide very specific, farmer-friendly instructions. For example, instead of just "Broadcast", say "Broadcast evenly across the field before final ploughing". For liquid fertilizers or sprays, you MUST provide clear mixing instructions like "Mix 5ml in 1 liter of water and spray on the foliage".

Your response must be structured as a list of 'seasonalPlans', with one entry for each crop in the user's selected cycle. The plan must be practical, scientifically sound, and easy for a farmer in India to implement.`,
});

const yearLongVarietyPlanFlow = ai.defineFlow(
  {
    name: 'yearLongVarietyPlanFlow',
    inputSchema: YearLongVarietyPlanInputSchema,
    outputSchema: YearLongVarietyPlanOutputSchema,
  },
  async (input) => {
    const { output } = await yearLongVarietyPlanPrompt(input);
    return output!;
  }
);
