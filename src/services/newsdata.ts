
import "server-only";
import type { NewsItem } from '@/lib/types';

const NEWSDATA_API_URL = 'https://newsdata.io/api/1/news';

export async function getNews(query: string): Promise<NewsItem[]> {
    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) {
        console.warn("newsdata.io API key not set. Returning mock data.");
        return [{ title: "Mock News: Govt. increases MSP for Wheat", summary: "A mock summary of the news.", link: "#" }];
    }

    const url = new URL(NEWSDATA_API_URL);
    url.searchParams.append('apikey', apiKey);
    url.searchParams.append('q', query);
    url.searchParams.append('language', 'en');
    url.searchParams.append('country', 'in');
    url.searchParams.append('category', 'business,science,technology');


    try {
        const response = await fetch(url.toString());
        if (!response.ok) {
            console.error('Newsdata.io API Error:', await response.text());
            throw new Error(`Newsdata.io API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const articles: NewsItem[] = (data.results || []).map((article: any) => ({
            title: article.title,
            summary: article.description || article.content || '',
            link: article.link
        })).slice(0, 5); // Return top 5 articles

        return articles;
    } catch (error) {
        console.error("Failed to fetch from newsdata.io API:", error);
        return [{ title: "Mock News on API Error", summary: "A mock summary of the news because the API failed.", link: "#" }];
    }
}
