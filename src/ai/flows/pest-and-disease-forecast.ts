
'use server';

/**
 * @fileOverview Provides a proactive forecast for potential pests and diseases.
 * 
 * This flow uses farm data, crop type, real-time weather, and recent news
 * to predict upcoming threats and provide preventative solutions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { PestDiseaseForecastInputSchema, PestDiseaseForecastOutputSchema, type PestDiseaseForecastInput, type PestDiseaseForecastOutput } from '@/lib/types';
import { getWeather } from '@/services/weather';
import { getNews } from '@/services/newsdata';

const weatherTool = ai.defineTool(
    {
        name: 'getWeatherForForecast',
        description: 'Gets the current weather for a specific location to help in forecasting pests and diseases.',
        inputSchema: z.object({ location: z.string().describe("The city or area to get weather for.") }),
        outputSchema: z.object({
            temp: z.number(),
            condition: z.string(),
            wind_speed: z.number(),
            humidity: z.number(),
        }),
    },
    async (input) => getWeather(input.location)
);

const newsTool = ai.defineTool(
    {
        name: 'getNewsForForecast',
        description: 'Gets recent news articles related to agriculture or a specific crop to identify reported outbreaks.',
        inputSchema: z.object({ query: z.string().describe("The search query for news, e.g., 'agriculture' or a crop name.") }),
        outputSchema: z.array(z.object({
            title: z.string(),
            summary: z.string(),
            link: z.string(),
        })),
    },
    async (input) => getNews(input.query)
);

const pestDiseaseForecastPrompt = ai.definePrompt({
    name: 'pestDiseaseForecastPrompt',
    input: { schema: PestDiseaseForecastInputSchema },
    output: { schema: PestDiseaseForecastOutputSchema },
    tools: [weatherTool, newsTool],
    prompt: `You are an expert plant pathologist and entomologist providing preventative advice to an Indian farmer. Your goal is to forecast potential pest and disease threats based on real-time data and provide actionable, preventative solutions. "Prevention is better than cure."
Your entire response, including all text fields, MUST be in the specified language: {{{language}}}.

Farm & Crop Information:
- Crop: {{{cropName}}}
- Location: {{{farm.location}}}
- Soil Type: {{{farm.soilType}}}
- Language: {{{language}}}

Your Task:
1.  **Gather Intelligence**:
    *   Use the 'getWeatherForForecast' tool to get the current weather for '{{{farm.location}}}'. High humidity or specific temperature ranges can favor certain diseases.
    *   Use the 'getNewsForForecast' tool to search for news about '{{{cropName}}} outbreaks' or 'agriculture pests India'. This can reveal if specific threats are currently active in the wider region.

2.  **Analyze and Forecast**:
    *   Based on the crop, location, soil, weather, and news, identify the 2-3 most likely pests and diseases that could pose a threat in the near future.
    *   For each threat, determine if it is a 'Pest' or a 'Disease'.
    *   Provide a brief, farmer-friendly description of the key 'symptoms' for early identification.
    *   Generate a placeholder image URL: 'https://placehold.co/600x400.png'.

3.  **Provide Preventative Measures**: This is the most critical part. For each threat, provide a detailed 'preventativeMeasures' plan:
    *   **Organic**: List 1-2 practical organic prevention methods. Give clear, specific instructions. For example: "Prophylactic spray of Neem oil (5ml per liter of water) every 15 days."
    *   **Chemical**: List 1-2 appropriate chemical prevention methods. Provide the chemical name, concentration, and application instructions. For example: "Precautionary spray of Mancozeb 75% WP (2 grams per liter of water) during cloudy weather."

Your response must be authoritative, data-driven, and easy for a farmer to understand and implement. The focus is on what to do *before* the problem appears.`,
});

const pestDiseaseForecastFlow = ai.defineFlow(
  {
    name: 'pestDiseaseForecastFlow',
    inputSchema: PestDiseaseForecastInputSchema,
    outputSchema: PestDiseaseForecastOutputSchema,
  },
  async (input) => {
    const { output } = await pestDiseaseForecastPrompt(input);
    return output!;
  }
);

export async function getPestDiseaseForecast(input: PestDiseaseForecastInput): Promise<PestDiseaseForecastOutput> {
    return pestDiseaseForecastFlow(input);
}
