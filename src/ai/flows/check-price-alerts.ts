
'use server';

/**
 * @fileOverview Checks active price alerts against current market data, updates their status, and sends WhatsApp notifications.
 */
import {z} from 'genkit';
import {ai} from '@/ai/genkit';
import {getMandiPrices} from '@/services/datagov';
import {db} from '@/lib/firebase';
import {doc, updateDoc} from 'firebase/firestore';
import type {MarketAlert, Profile} from '@/lib/types';
import { sendWhatsAppMessage } from '@/services/twilio';

const PriceCheckInputSchema = z.object({
  alerts: z.array(z.any()).describe('An array of active MarketAlert objects.'),
  profile: z.any().describe("The user's profile for location context."),
  phone: z.string().describe("The user's phone number to send notifications to."),
});
export type PriceCheckInput = z.infer<typeof PriceCheckInputSchema>;

// This flow doesn't need a complex output, just success/fail.
const PriceCheckOutputSchema = z.object({
  triggeredAlerts: z.array(z.string()).describe('A list of alert IDs that were triggered.'),
});
export type PriceCheckOutput = z.infer<typeof PriceCheckOutputSchema>;

const getMandiPricesTool = ai.defineTool(
  {
    name: 'getMandiPricesForAlerts',
    description: 'Gets the latest market (mandi) prices for a specific crop in a given state and district.',
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

export const checkPriceAlertsFlow = ai.defineFlow(
  {
    name: 'checkPriceAlertsFlow',
    inputSchema: PriceCheckInputSchema,
    outputSchema: PriceCheckOutputSchema,
  },
  async ({alerts, profile, phone}) => {
    const triggeredAlerts: string[] = [];

    const locationParts = profile.location.split(',').map(p => p.trim());
    const district = locationParts[0] || 'pune';
    const state = locationParts[1] || 'maharashtra';

    for (const alert of alerts) {
      if (alert.status !== 'active') continue;

      const prices = await getMandiPricesTool({state, district, crop: alert.crop});

      const highestPrice = prices.reduce((max, p) => (p.price > max ? p.price : max), 0);

      if (highestPrice > alert.priceThreshold) {
        // Threshold met, update the alert in Firestore
        const alertRef = doc(db, 'marketAlerts', alert.id);
        await updateDoc(alertRef, {
          status: 'triggered',
          triggeredAt: new Date().toISOString(),
          triggeredPrice: highestPrice,
        });
        triggeredAlerts.push(alert.id);

        // Send WhatsApp notification
        const message = `📈 Krish-AI Price Alert! 📈\n\nThe price for *${alert.crop}* has reached *₹${highestPrice}* per quintal in the ${district} region, which is above your target of ₹${alert.priceThreshold}.\n\nConsider visiting the Market Insights page for more details.`;
        try {
            await sendWhatsAppMessage(phone, message);
        } catch (error) {
            console.error(`Failed to send WhatsApp notification for alert ${alert.id}:`, error);
            // We don't throw an error here to allow other alerts to be processed.
            // The error is logged on the server.
        }
      }
    }
    return {triggeredAlerts};
  }
);

export async function checkPriceAlerts(input: PriceCheckInput): Promise<PriceCheckOutput> {
  return await checkPriceAlertsFlow(input);
}
