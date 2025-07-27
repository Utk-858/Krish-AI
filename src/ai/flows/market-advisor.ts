
'use server';

/**
 * @fileOverview An AI agent that provides advice on selling crops using real-time data.
 *
 * - getSellAdvice - A function that provides a "sell or wait" recommendation.
 */

import { ai } from '@/ai/genkit';
import { MarketDataSchema, SellAdviceSchema, type MarketData, type SellAdvice } from '@/lib/types';
import { z } from 'zod';
import { getMandiPrices } from '@/services/datagov';
import { getNews } from '@/services/newsdata';
import { getWeather } from '@/services/weather';
import type { Profile } from '@/lib/types';


const mandiPriceTool = ai.defineTool(
    {
        name: 'getMandiPrices',
        description: 'Gets the latest market (mandi) prices for a specific crop in a given state and district.',
        inputSchema: z.object({
            state: z.string().describe('The state to search for prices in.'),
            district: z.string().describe('The district to search for prices in.'),
            crop: z.string().describe('The crop to get prices for.'),
        }),
        outputSchema: z.array(z.object({
            market: z.string(),
            price: z.number(),
        })),
    },
    async (input) => getMandiPrices(input.state, input.district, input.crop)
);

const weatherTool = ai.defineTool(
    {
        name: 'getWeather',
        description: 'Gets a 3-day weather forecast for a specific location.',
        inputSchema: z.object({ location: z.string().describe("The city or area to get weather for.") }),
        outputSchema: z.array(z.object({
            day: z.string(),
            temp: z.number(),
            condition: z.string(),
            rain_probability: z.number(),
            humidity: z.number(),
        })),
    },
    async (input) => getWeather(input.location)
);

const newsTool = ai.defineTool(
    {
        name: 'getNews',
        description: 'Gets recent news articles related to agriculture or a specific crop.',
        inputSchema: z.object({ query: z.string().describe("The search query for news, e.g., 'agriculture' or a crop name.") }),
        outputSchema: z.array(z.object({
            title: z.string(),
            summary: z.string(),
            link: z.string(),
        })),
    },
    async (input) => getNews(input.query)
);


const sellOrWaitAdvisorPrompt = ai.definePrompt({
    name: 'sellOrWaitAdvisorPrompt',
    input: { schema: MarketDataSchema },
    output: { schema: SellAdviceSchema },
    tools: [mandiPriceTool, weatherTool, newsTool],
    prompt: `You are an expert agricultural market advisor for Indian farmers. Your goal is to provide a clear 'sell' or 'wait' recommendation and compile all relevant market data based on real-time information.
Your entire response, including all text fields, MUST be in the specified language: {{{profile.language}}}.

Analyze the following situation for the farmer:
- Farmer's Profile: Location - {{{profile.location}}}, Language: {{{profile.language}}}
- Crop: {{{crop}}}
- Quantity: {{{quantity}}} {{{unit}}}
- Harvest Status: {{{harvestStatus}}}
- Storage Viability: Can be stored for {{{storageDaysLeft}}} more days.

Your Task:
1.  **Gather All Intelligence**:
    *   Use the 'getWeather' tool to check the 3-day weather forecast in the farmer's location ('{{{profile.location}}}').
    *   Use the 'getMandiPrices' tool to find the latest prices for '{{{crop}}}' in the farmer's district ('{{{district}}}') and state ('{{{state}}}'). Prices are typically in quintals, so if the user provides quantity in kg, you may need to mention this in your reasoning.
    *   Use the 'getNews' tool to search for recent news about '{{{crop}}}'.

2.  **Formulate a Recommendation**:
    *   Based on all the data you've gathered (prices, weather forecast, news), decide whether the farmer should 'sell' now or 'wait'.
    *   If the crop is not yet harvested (check 'harvestStatus'), the recommendation must be to 'wait'.
    *   If the weather forecast shows heavy rain in the next few days, this could disrupt transport and market access, so selling now might be better. Mention this in your reasoning.
    *   **If the 'getMandiPrices' tool returns no results, state that local prices are unavailable and base your recommendation on weather and news only.** In this case, 'wait' or 'hold' is a likely recommendation unless news is strongly negative.
    *   If selling, find the mandi with the highest price from the 'getMandiPrices' tool output. Set the 'bestMandi.name' to its 'market' and 'bestMandi.price' to its 'price'.
    *   Provide clear 'reasoning' for your decision, citing the data you used. For example: "With prices at the APMC yard currently at Rs XXXX and good weather for transport for the next 3 days, it's a good time to sell." or "The crop is not yet harvested, so you should wait."

3.  **Predict Future Price**:
    *   Give a realistic, conservative price prediction for the near future based on the trends you've identified. If no price data is available, state that a prediction cannot be made.

4.  **Structure the Output**: Fill out ALL the fields in the 'SellAdvice' JSON schema.
    *   'recommendation', 'reasoning', 'predictedPrice', and 'bestMandi' should contain your analysis and advice.
    *   'mandiPrices', 'weather', and 'news' fields must be populated with the **full, direct output** from the corresponding tools. Do not summarize or alter the tool output in these fields. Return the complete data from the tools.`,
});

export async function getSellAdvice(input: MarketData): Promise<SellAdvice> {
    // Reliably parse district and state from the location string.
    const locationParts = input.profile.location.split(',').map(p => p.trim());
    const district = locationParts[0] || 'Unknown';
    const state = locationParts[1] || 'Unknown';

    const { output } = await sellOrWaitAdvisorPrompt({...input, district, state});
    return output!;
}
