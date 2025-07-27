
'use server';

/**
 * @fileOverview A chatbot for agricultural queries.
 *
 * - askAgriBot - A function that handles chatbot conversations.
 */

import {ai} from '@/ai/genkit';
import {AgriBotInputSchema, AgriBotOutputSchema, type AgriBotInput, type AgriBotOutput} from '@/lib/types';
import { z } from 'zod';

const agriBotPrompt = ai.definePrompt({
    name: 'agriBotPrompt',
    input: { schema: AgriBotInputSchema },
    output: { schema: AgriBotOutputSchema },
    prompt: `You are AgriBot, a friendly and knowledgeable AI assistant for Indian farmers.
Your goal is to provide helpful, concise, and practical advice on various farming topics.
Answer the user's question based on the context of the conversation history.
Keep your answers brief and to the point.
You MUST answer in the user's specified language: {{language}}.

User's Question: {{query}}
`,
});


export async function askAgriBot(input: AgriBotInput): Promise<AgriBotOutput> {
    const history = input.chatHistory?.map(item => ({
        role: item.role,
        content: [{text: item.content}]
    })) || [];

    const {output} = await agriBotPrompt({
        query: input.query,
        language: input.language,
        chatHistory: input.chatHistory
    });

    return output!;
}
