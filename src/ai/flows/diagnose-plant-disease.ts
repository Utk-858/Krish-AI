
'use server';
/**
 * @fileOverview An AI agent for diagnosing plant diseases.
 *
 * This flow analyzes farm data, user-provided symptoms, and an optional photo
 * to identify potential plant diseases. It provides detailed treatment plans
 * and uses a tool to find recommendations for local vendors.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Farm } from '@/lib/types';
import { findNearbyAgriShops } from '@/services/places';

// Input Schema
const DiagnosisInputSchema = z.object({
  farm: z.any().describe('A Farm object containing details like location, crop, etc.'),
  symptoms: z.string().optional().describe('User-described symptoms of the plant disease.'),
  photoDataUri: z.string().optional().describe(
    "A photo of the diseased plant as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  language: z.string().describe("The user's preferred language (e.g., 'en', 'hi')."),
});
export type DiagnosisInput = z.infer<typeof DiagnosisInputSchema>;

// Output Schema
const DiagnosisOutputSchema = z.object({
  diagnosis: z.array(z.object({
    diseaseName: z.string().describe('The common name of the likely disease.'),
    confidence: z.number().describe('The AI confidence score for this diagnosis (0-100).'),
    description: z.string().describe('A farmer-friendly description of the disease.'),
    symptoms: z.array(z.string()).describe('A checklist of common symptoms for this disease.'),
    treatment: z.object({
      organic: z.array(z.object({
        solutionName: z.string().describe('Name of the organic treatment/solution.'),
        applicationMethod: z.string().describe('How to apply the solution.'),
        safetyWarning: z.string().describe('Any safety precautions to take.'),
      })).describe('A list of organic treatment options.'),
      inorganic: z.array(z.object({
        solutionName: z.string().describe('Name of the inorganic/chemical treatment.'),
        applicationMethod: z.string().describe('How to apply the chemical solution.'),
        safetyWarning: z.string().describe('Any safety precautions to take.'),
      })).describe('A list of inorganic treatment options.'),
       schedule: z.array(z.object({
            week: z.string().describe("The week number or range, e.g., 'Week 1-2'"),
            activity: z.string().describe("The key activity for that week, e.g., 'Spray Neem Oil' or 'Monitor for new spots'.")
        })).describe("A week-by-week treatment schedule."),
    }).describe('Detailed treatment recommendations.'),
    vendorRecommendations: z.array(z.object({
        name: z.string().describe("Name of a local agricultural supply store."),
        address: z.string().describe("The address of the store."),
        phone: z.string().describe("The contact phone number for the store."),
    })).describe("A list of 2-3 local vendors where remedies can be purchased, based on the farm's location.")
  })).describe('A list of top 2-3 likely disease diagnoses.')
});
export type DiagnosisOutput = z.infer<typeof DiagnosisOutputSchema>;


const findShopsTool = ai.defineTool(
    {
        name: 'findNearbyAgriShops',
        description: 'Finds nearby agricultural supply shops (Krishi Kendra) based on a location.',
        inputSchema: z.object({ location: z.string().describe("The city or area to search in.") }),
        outputSchema: z.array(z.object({
            name: z.string(),
            address: z.string(),
            phone: z.string().optional(),
        })),
    },
    async (input) => findNearbyAgriShops(input.location)
);


const diagnosisPrompt = ai.definePrompt({
    name: 'plantDiagnosisPrompt',
    input: { schema: DiagnosisInputSchema },
    output: { schema: DiagnosisOutputSchema },
    tools: [findShopsTool],
    prompt: `You are an expert plant pathologist and agricultural advisor for Indian farmers. Your task is to diagnose a crop disease based on the provided information and give a comprehensive, actionable plan.
Your entire response, including all text fields, MUST be in the specified language: {{{language}}}.

Farm Information:
- Crop: {{{farm.mainCrop}}}
- Location: {{{farm.location}}}
- Language: {{{language}}}

Evidence Provided by Farmer:
- Symptoms described: {{{symptoms}}}
{{#if photoDataUri}}
- Photo of the plant: {{media url=photoDataUri}}
{{/if}}

Instructions:
1.  **Analyze the Evidence**: Based on the photo (if provided) and/or the symptoms, identify the top 2-3 most likely diseases affecting the '{{{farm.mainCrop}}}' crop.
2.  **Provide Diagnoses**: For each likely disease, provide:
    *   'diseaseName': The common name of the disease.
    *   'confidence': Your confidence level (0-100) that this is the correct diagnosis.
    *   'description': A simple, easy-to-understand explanation of the disease.
    *   'symptoms': A bullet-point list of key symptoms to help the farmer confirm the diagnosis.
3.  **Recommend Treatments**: For each diagnosis, provide a detailed treatment plan:
    *   'organic': Suggest 1-2 organic solutions (e.g., Neem oil, Trichoderma).
    *   'inorganic': Suggest 1-2 chemical solutions (e.g., Mancozeb, Copper Oxychloride).
    *   For each solution, detail the 'applicationMethod' (e.g., "Mix 5ml per liter of water and spray on leaves every 7 days") and any 'safetyWarning'.
    *   'schedule': Create a simple 3-4 week schedule outlining key actions (e.g., Week 1: Apply Spray A, Week 2: Monitor, Week 3: Re-apply if needed).
4.  **Find Local Vendors**:
    *   Use the 'findNearbyAgriShops' tool to find real agricultural supply stores based on the farm's location ('{{{farm.location}}}').
    *   Include the results from the tool in the 'vendorRecommendations' field of your response. Do not make up vendor information.

Your response must be practical, empathetic, and tailored to an Indian farmer. Prioritize safe and effective solutions.`,
});


export async function diagnosePlantDisease(input: DiagnosisInput): Promise<DiagnosisOutput> {
  const { output } = await diagnosisPrompt(input);
  return output!;
}
