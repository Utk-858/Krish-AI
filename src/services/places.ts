
'use server';

import "server-only";

const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchText';

interface Place {
  displayName: {
    text: string;
    languageCode: string;
  };
  formattedAddress: string;
  nationalPhoneNumber?: string;
}

export async function findNearbyAgriShops(location: string): Promise<{ name: string; address: string; phone?: string }[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn("Google Places API key is not set. Returning mock data.");
    return [
        { name: 'Mock Krishi Kendra', address: '123 Mock Street, Mockville', phone: '9876543210' }
    ];
  }

  const textQuery = `Krishi Seva Kendra OR agricultural supply OR fertilizer shop OR pesticide shop OR seed supplier in ${location}`;

  const requestBody = {
    textQuery,
    languageCode: 'en',
    maxResultCount: 10,
  };

  try {
    const response = await fetch(PLACES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error('Google Places API Error:', await response.text());
      return [];
    }

    const data = await response.json();
    const places: Place[] = data.places ?? [];

    if (!places || places.length === 0) {
        return [];
    }
    
    // Use a Map to filter out duplicates based on name and address
    const uniqueSuppliers = new Map<string, { name: string; address: string; phone?: string }>();
    for (const place of places) {
        if (place.displayName && place.displayName.text && place.formattedAddress) {
            const key = `${place.displayName.text}-${place.formattedAddress}`;
            if (!uniqueSuppliers.has(key)) {
                uniqueSuppliers.set(key, {
                    name: place.displayName.text,
                    address: place.formattedAddress,
                    phone: place.nationalPhoneNumber,
                });
            }
        }
    }
    
    return Array.from(uniqueSuppliers.values());

  } catch (err) {
    console.error("Failed to fetch from Places API:", err);
    return []; 
  }
}
