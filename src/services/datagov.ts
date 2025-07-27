
import "server-only";
import type { MandiPrice } from '@/lib/types';

// Docs: https://data.gov.in/resource/daily-market-prices-agricultural-commodities
const DATA_GOV_API_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

export async function getMandiPrices(state: string, district: string, commodity: string): Promise<MandiPrice[]> {
    const apiKey = process.env.DATA_GOV_API_KEY;
    if (!apiKey) {
        console.warn("data.gov.in API key not set. Returning mock data.");
        return [
            { market: `Mock Market 1, ${district}`, price: Math.floor(Math.random() * 500) + 2000 },
            { market: `Mock Market 2, ${district}`, price: Math.floor(Math.random() * 500) + 1900 },
        ];
    }

    const url = new URL(DATA_GOV_API_URL);
    url.searchParams.append('api-key', apiKey);
    url.searchParams.append('format', 'json');
    url.searchParams.append('limit', '10'); // Limit to 10 records
    url.searchParams.append('filters[state]', state);
    url.searchParams.append('filters[district]', district);
    url.searchParams.append('filters[commodity]', commodity);
    
    try {
        const response = await fetch(url.toString());
        if (!response.ok) {
            console.error('Data.gov.in API Error:', await response.text());
            throw new Error(`Data.gov.in API request failed with status ${response.status}`);
        }
        const data = await response.json();
        
        const prices: MandiPrice[] = data.records.map((record: any) => ({
            market: record.market,
            price: Number(record.modal_price)
        }));

        if(prices.length === 0) {
            return [
                { market: `Mock Market (No real data), ${district}`, price: Math.floor(Math.random() * 500) + 2000 },
            ];
        }

        return prices;

    } catch (error) {
        console.error("Failed to fetch from data.gov.in API:", error);
         return [
            { market: `Mock Market (API Error), ${district}`, price: 2150 },
            { market: `Mock Market 2 (API Error), ${district}`, price: 2050 },
        ];
    }
}
