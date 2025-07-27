
import { z } from 'zod';

export interface Profile {
  name: string;
  location: string;
  language: string;
  avatarUrl?: string;
}

export interface Farm {
  id: string;
  userId: string;
  name:string;
  location: string;
  size: number;
  sizeUnit: 'acres' | 'hectares';
  mainCrop: string;
  soilType?: string;
  irrigation?: string;
  lastCrop?: string;
}

const farmDetailsSchema = z.object({
    size: z.number().describe('The size of the farm.'),
    sizeUnit: z.string().describe('The unit of size (e.g., acres, hectares).'),
    location: z.string().describe('The geographical location of the farm.'),
    soilType: z.string().optional().describe('The type of soil on the farm.'),
    irrigation: z.string().optional().describe('The irrigation system available. Can be a comma-separated list like "Borewell, Canal".'),
    plantingMonth: z.string().optional().describe('The intended month for planting the crop.'),
    lastCrop: z.string().optional().describe('The last crop grown on this farm, for crop rotation purposes.')
});

export const CropRecommendationInputSchema = z.object({
    farm: farmDetailsSchema.describe("The user's farm data."),
    language: z.string().describe("The user's preferred language (e.g., 'en', 'hi')."),
});
export type CropRecommendationInput = z.infer<typeof CropRecommendationInputSchema>;

const recommendationSchema = z.object({
    cropName: z.string().describe('The name of the recommended crop or variety.'),
    isBestFit: z.boolean().optional().describe('Whether this is the single best recommendation for the season.'),
    description: z.string().describe('A short description of the crop/variety.'),
    reason: z.string().describe('Why this crop/variety is a good fit, considering farm data like location, soil, and the last crop for rotation purposes.'),
    sowingMonth: z.string().describe('The ideal month for sowing.'),
    estimatedDuration: z.string().describe('The estimated time to harvest.'),
    marketSuitability: z.string().describe('Market trends and suitability.'),
    cropOverview: z.object({
        bestSeason: z.string().describe("The best season to sow the crop, e.g., Kharif, Rabi."),
        harvestDuration: z.string().describe("The typical time from sowing to harvest, e.g., '90-120 days'."),
        recommendedLandType: z.string().describe("The ideal type of land or soil for this crop."),
        seedRate: z.string().describe("The recommended amount of seed per unit area, e.g., '20-25 kg/acre'."),
        irrigationNeeds: z.string().describe("Description of the crop's water requirements."),
        estimatedWaterUsage: z.string().describe("An estimated total water usage, e.g., '~600 mm'."),
        seedTreatment: z.string().describe("Instructions for treating seeds before sowing."),
    }).describe('A quick overview of key crop details.'),
    sowingWindows: z.array(z.object({
        dateRange: z.string().describe("A specific date range for sowing, e.g., 'July 15 - July 25'."),
        riskLevel: z.enum(['Low', 'Medium', 'High']).describe("The risk associated with this sowing window."),
        isPmfbyEligible: z.boolean().describe("Whether this window is typically eligible for PMFBY insurance."),
        description: z.string().describe("A short description of the conditions and potential for this window."),
    })).length(3).describe('Three distinct sowing windows with associated risk levels.'),
    pmfbyReminder: z.string().describe("A reminder about checking PMFBY insurance deadlines for the user's location."),
    plan: z.object({
        landPreparation: z.array(z.string()).describe('Steps for land preparation.'),
        seedSelection: z.array(z.string()).describe('Recommended seed varieties.'),
        irrigationSchedule: z.string().describe('The irrigation frequency and method.'),
        sprayingSchedule: z.string().describe("A basic schedule for organic/inorganic sprays. Mention specific nutrients needed to replenish soil after the last crop."),
        timeline: z.array(z.object({
            week: z.string().describe("The week number or range, e.g., 'Week 1-2'"),
            activity: z.string().describe("The key activity for that week.")
        })).describe("A week-by-week timeline of the crop lifecycle."),
    }).describe('A detailed action plan.'),
    estimatedCosts: z.object({
        seed: z.number().describe('Estimated cost for seeds per size unit.'),
        fertilizer: z.number().describe('Estimated cost for fertilizer per size unit.'),
        pesticide: z.number().describe('Estimated cost for pesticides per size unit.'),
        labor: z.number().describe('Estimated labor cost per size unit.'),
        irrigation: z.number().describe('Estimated irrigation cost per size unit.'),
    }).describe('Estimated input costs based on location.'),
    estimatedYield: z.number().describe('Estimated yield in kg per size unit.'),
    estimatedSellingPrice: z.number().describe('Estimated selling price in Rs per kg.'),
});


export const CropRecommendationOutputSchema = z.object({
  recommendations: z.array(recommendationSchema).describe('A list of top 4 crop recommendations.')
});
export type CropRecommendationOutput = z.infer<typeof CropRecommendationOutputSchema>;


export const VarietyRecommendationInputSchema = z.object({
    farm: farmDetailsSchema.describe("The user's farm data."),
    cropName: z.string().describe("The crop for which to recommend varieties."),
    language: z.string().describe("The user's preferred language (e.g., 'en', 'hi')."),
});
export type VarietyRecommendationInput = z.infer<typeof VarietyRecommendationInputSchema>;


export const VarietyRecommendationOutputSchema = z.object({
  recommendations: z.array(recommendationSchema).describe('A list of top 4 variety recommendations for the given crop.')
});
export type VarietyRecommendationOutput = z.infer<typeof VarietyRecommendationOutputSchema>;


export const AgriBotInputSchema = z.object({
    query: z.string().describe('The user query.'),
    chatHistory: z.array(z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
    })).optional().describe('The chat history.'),
    language: z.string().describe("The user's preferred language (e.g., 'en', 'hi')."),
});
export type AgriBotInput = z.infer<typeof AgriBotInputSchema>;

export const AgriBotOutputSchema = z.object({
    response: z.string().describe('The AI response.'),
});
export type AgriBotOutput = z.infer<typeof AgriBotOutputSchema>;


export const DiagnosisReportSchema = z.object({
  id: z.string(),
  userId: z.string(),
  farmId: z.string(),
  crop: z.string(),
  imageURL: z.string().optional(),
  symptoms: z.string().optional(),
  selectedDisease: z.string(),
  aiConfidence: z.number(),
  selectedTreatment: z.object({
    organic: z.array(z.object({
      solutionName: z.string(),
      applicationMethod: z.string(),
      safetyWarning: z.string(),
    })),
    inorganic: z.array(z.object({
      solutionName: z.string(),
      applicationMethod: z.string(),
      safetyWarning: z.string(),
    })),
    schedule: z.array(z.object({
      week: z.string(),
      activity: z.string(),
    })),
  }),
  vendorRecommendations: z.array(z.object({
    name: z.string(),
    address: z.string(),
    phone: z.string(),
  })),
  timestamp: z.string(),
});
export type DiagnosisReport = z.infer<typeof DiagnosisReportSchema>;

export const MarketAlertSchema = z.object({
  id: z.string(),
  userId: z.string(),
  crop: z.string(),
  priceThreshold: z.number(),
  status: z.enum(['active', 'triggered', 'cancelled', 'acknowledged']),
  createdAt: z.string(),
  triggeredAt: z.string().optional(),
  triggeredPrice: z.number().optional(),
});
export type MarketAlert = z.infer<typeof MarketAlertSchema>;

export const MarketDataSchema = z.object({
    profile: z.any().describe("The user's profile information, including location and language."),
    crop: z.string().describe("The crop to be sold, e.g., 'Tomato'."),
    quantity: z.number().describe("The quantity of the crop to sell."),
    unit: z.enum(['kg', 'quintal']).describe("The unit for the quantity, e.g., 'kg' or 'quintal'."),
    harvestStatus: z.enum(['Harvested', 'Not Harvested']).describe("Whether the crop is already harvested."),
    storageDaysLeft: z.number().describe("How many more days the crop can be stored before spoilage."),
});
export type MarketData = z.infer<typeof MarketDataSchema>;

export const DailyForecastSchema = z.object({
    day: z.string().describe("The day of the forecast, e.g., 'Today', 'Tomorrow'."),
    temp: z.number().describe('The maximum temperature in Celsius.'),
    condition: z.string().describe('A brief description of the weather condition, e.g., "Partly cloudy".'),
    rain_probability: z.number().describe("The maximum probability of rain as a percentage (0-100)."),
    humidity: z.number().describe("The mean relative humidity as a percentage (0-100)."),
});
export type DailyForecast = z.infer<typeof DailyForecastSchema>;

export const SellAdviceSchema = z.object({
    recommendation: z.enum(['sell', 'wait', 'hold']).describe("The final recommendation: 'sell' now, 'wait' for a specific period, or 'hold' if uncertain."),
    reasoning: z.string().describe("A detailed explanation for the recommendation, citing market trends, prices, and other factors."),
    predictedPrice: z.string().describe("The predicted price range in the near future, e.g., 'Rs 2,100 - Rs 2,300 per quintal'."),
    bestMandi: z.object({
        name: z.string().describe("The name of the recommended mandi (market)."),
        price: z.number().describe("The current price at that mandi."),
    }).optional().describe("The best market to sell at if the recommendation is to sell."),
    mandiPrices: z.array(z.object({
        market: z.string(),
        price: z.number(),
    })).describe("List of current prices in nearby mandis."),
    weather: z.array(DailyForecastSchema).describe("A 3-day weather forecast for the farmer's location."),
    news: z.array(z.object({
        title: z.string(),
        summary: z.string(),
        link: z.string(),
    })).describe("Recent relevant news articles."),
});
export type SellAdvice = z.infer<typeof SellAdviceSchema>;

export interface MandiPrice {
    market: string;
    price: number;
}

export interface NewsItem {
    title: string;
    summary: string;
    link: string;
}

export interface Weather {
    temp: number;
    condition: string;
    wind_speed: number;
    humidity: number;
}


// Community Types
export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: string | null; // Should be ISO string, can be null initially
  content: string;
  imageUrl?: string;
  likesCount: number;
  commentsCount: number;
  likedBy: string[];
}

export interface CommunityComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: string | null; // Should be ISO string, can be null initially
  content: string;
}

// Soil Health Card Schema
export const SoilHealthCardSchema = z.object({
    ph: z.number().describe('The pH level of the soil.'),
    organic_carbon: z.number().describe('The percentage of organic carbon in the soil (e.g., 0.5 for 0.5%).'),
    nitrogen: z.number().describe('Available Nitrogen (N) in kg/ha.'),
    phosphorus: z.number().describe('Available Phosphorus (P) in kg/ha.'),
    potassium: z.number().describe('Available Potassium (K) in kg/ha.'),
});
export type SoilHealthCard = z.infer<typeof SoilHealthCardSchema>;

// Fertilizer Recommendation Schemas
const ApplicationItemSchema = z.object({
    applicationStage: z.string().describe("A descriptive growth stage for application (e.g., 'Basal Dose (at Sowing)', 'Tillering Stage (25-30 DAT)')."),
    fertilizerName: z.string().describe("The name of the fertilizer (e.g., 'Urea', 'DAP', 'MOP' for inorganic; 'Vermicompost', 'Neem Cake' for organic)."),
    quantity: z.string().describe("The quantity to apply per acre (e.g., '50 kg' or '2 tonnes')."),
    applicationMethod: z.string().describe("Clear, farmer-friendly instructions. E.g., for dry application: 'Broadcast evenly before ploughing.' For wet application: 'Mix 5ml in 1 liter of water and spray on foliage.'")
});

export const FertilizerRecommendationInputSchema = z.object({
    soilHealthCard: SoilHealthCardSchema,
    cropName: z.string().describe('The name of the crop for which fertilizer is being recommended.'),
    location: z.string().describe('The location of the farm for regional context.'),
    language: z.string().describe("The user's preferred language (e.g., 'en', 'hi')."),
});
export type FertilizerRecommendationInput = z.infer<typeof FertilizerRecommendationInputSchema>;


export const FertilizerRecommendationOutputSchema = z.object({
    npkRecommendation: z.object({
        n: z.number().describe('Recommended Nitrogen (N) in kg/acre.'),
        p: z.number().describe('Recommended Phosphorus (P) in kg/acre.'),
        k: z.number().describe('Recommended Potassium (K) in kg/acre.'),
    }).describe('The recommended NPK dosage.'),
    fertilizerPlan: z.object({
        inorganic: z.array(ApplicationItemSchema).describe('A detailed plan for conventional/inorganic fertilizer application.'),
        organic: z.array(ApplicationItemSchema).describe('A detailed plan for organic fertilizer application.'),
    }),
    recommendedBrands: z.array(z.string()).describe("A list of trusted fertilizer brands (e.g., 'IFFCO', 'Kribhco')."),
    subsidyInfo: z.string().describe('Information on available government subsidies for fertilizers.'),
    notes: z.string().describe('Additional notes or precautions, applicable to both organic and inorganic approaches.'),
});
export type FertilizerRecommendationOutput = z.infer<typeof FertilizerRecommendationOutputSchema>;


// Water Management Schemas
export const WaterManagementInputSchema = z.object({
    farm: farmDetailsSchema.describe("The user's farm data."),
    cropName: z.string().describe('The name of the crop for which a water plan is needed.'),
    language: z.string().describe("The user's preferred language (e.g., 'en', 'hi')."),
});
export type WaterManagementInput = z.infer<typeof WaterManagementInputSchema>;


export const WaterManagementOutputSchema = z.object({
  waterPlan: z.array(z.object({
      source: z.string().describe("The irrigation source this advice applies to (e.g., 'Borewell', 'Canal/Rain-fed')."),
      advice: z.string().describe("A paragraph of detailed, practical advice for this source."),
      schedule: z.array(z.object({
          growthStage: z.string().describe("The crop's growth stage (e.g., 'Initial Stage', 'Flowering Stage')."),
          frequency: z.string().describe("How often to irrigate (e.g., 'Every 8-10 days')."),
          duration: z.string().describe("A farmer-friendly measure of duration/quantity, specifying required water depth. E.g., 'Apply water until it reaches a depth of 3-4 inches across the field.'."),
      })).describe('A schedule for irrigation based on growth stages.')
  })).describe('A list of water management plans, one for each available irrigation source.')
});
export type WaterManagementOutput = z.infer<typeof WaterManagementOutputSchema>;

// Pest and Disease Forecast Schemas
export const PestDiseaseForecastInputSchema = z.object({
    farm: farmDetailsSchema.describe("The user's farm data."),
    cropName: z.string().describe('The name of the crop for which a forecast is needed.'),
    language: z.string().describe("The user's preferred language (e.g., 'en', 'hi')."),
});
export type PestDiseaseForecastInput = z.infer<typeof PestDiseaseForecastInputSchema>;

export const PestDiseaseForecastOutputSchema = z.object({
    threats: z.array(z.object({
        name: z.string().describe('The common name of the pest or disease.'),
        type: z.enum(['Pest', 'Disease']).describe('The type of threat.'),
        symptoms: z.string().describe('A brief, recognizable description of common symptoms.'),
        imageUrl: z.string().url().optional().describe('A URL for an image of the threat.'),
        preventativeMeasures: z.object({
            organic: z.array(z.string()).describe('A list of organic preventative measures with clear instructions, e.g., "Spray Neem oil (5ml/L of water) every 15 days."'),
            chemical: z.array(z.string()).describe('A list of chemical preventative measures with clear instructions, e.g., "Apply Chlorpyrifos 20EC (2ml/L of water) as a precautionary spray."'),
        }).describe('Detailed preventative measures.'),
    })).describe('A list of 2-3 potential pest and disease threats.'),
});
export type PestDiseaseForecastOutput = z.infer<typeof PestDiseaseForecastOutputSchema>;


// Year-Long Planner Schemas
export const YearLongPlannerInputSchema = z.object({
  location: z.string().describe('The geographical location of the farm (e.g., "Pune, Maharashtra").'),
  startMonth: z.string().describe('The month the user wants to start the crop cycle (e.g., "July").'),
  landArea: z.number().describe('The total land area available.'),
  landAreaUnit: z.enum(['acres', 'hectares']).describe('The unit for the land area.'),
  soilType: z.string().describe('The type of soil.'),
  irrigation: z.array(z.string()).describe('A list of available irrigation systems.'),
  preferredCrops: z.array(z.string()).optional().describe('A list of crops the user prefers to grow.'),
  language: z.string().describe("The user's preferred language (e.g., 'en', 'hi')."),
});
export type YearLongPlannerInput = z.infer<typeof YearLongPlannerInputSchema>;

const CropCycleRecommendationSchema = z.object({
    cropName: z.string().describe('The recommended crop for this cycle.'),
    variety: z.string().optional().describe('A specific recommended variety of the crop.'),
    duration: z.string().describe('The estimated duration of the crop cycle in months or days.'),
    reason: z.string().describe('A justification for why this crop is recommended for this season and location.'),
    isBestFit: z.boolean().optional().describe('Whether this is the single best recommendation for the season.'),
    estimatedCosts: z.object({
        seed: z.number().describe('Estimated cost for seeds per size unit.'),
        fertilizer: z.number().describe('Estimated cost for fertilizer per size unit.'),
        pesticide: z.number().describe('Estimated cost for pesticides per size unit.'),
        labor: z.number().describe('Estimated labor cost per size unit.'),
        irrigation: z.number().describe('Estimated irrigation cost per size unit.'),
    }).optional().describe('Estimated input costs based on location.'),
    estimatedYield: z.number().optional().describe('Estimated yield in kg per size unit.'),
    estimatedSellingPrice: z.number().optional().describe('Estimated selling price in Rs per kg.'),
});
export type CropCycleRecommendation = z.infer<typeof CropCycleRecommendationSchema>;


export const YearLongPlannerOutputSchema = z.object({
  kharif: z.array(CropCycleRecommendationSchema).describe('Top 2-3 crop recommendations for the Kharif season (June-Oct).'),
  rabi: z.array(CropCycleRecommendationSchema).describe('Top 2-3 crop recommendations for the Rabi season (Nov-Mar).'),
  zaid: z.array(CropCycleRecommendationSchema).describe('Top 2-3 crop recommendations for the Zaid season (Apr-June).'),
});
export type YearLongPlannerOutput = z.infer<typeof YearLongPlannerOutputSchema>;

export type SeasonalRecommendations = {
    kharif: CropCycleRecommendation[];
    rabi: CropCycleRecommendation[];
    zaid: CropCycleRecommendation[];
};


// Supplier Schemas
export const FindSuppliersInputSchema = z.object({
  location: z.string().describe("The city, district, or general area to search for suppliers in."),
});
export type FindSuppliersInput = z.infer<typeof FindSuppliersInputSchema>;

export const FindSuppliersOutputSchema = z.object({
  suppliers: z.array(z.object({
    name: z.string().describe("Name of the agricultural supply store (Krishi Kendra)."),
    address: z.string().describe("The full address of the store."),
    phone: z.string().optional().describe("The contact phone number for the store."),
  })).describe("A list of local vendors where seeds and other supplies can be purchased.")
});
export type FindSuppliersOutput = z.infer<typeof FindSuppliersOutputSchema>;


// Year-Long Variety and Final Plan Schemas
const farmDetailsForYearLongPlanSchema = z.object({
    location: z.string(),
    landArea: z.number(),
    landAreaUnit: z.enum(['acres', 'hectares']),
    soilType: z.string(),
    irrigation: z.array(z.string()),
});

export const YearLongVarietyPlanInputSchema = z.object({
  farm: farmDetailsForYearLongPlanSchema,
  cropCycle: z.array(z.object({
    season: z.string().describe("The season, e.g., Kharif, Rabi, Zaid"),
    cropName: z.string().describe("The crop chosen for that season."),
    variety: z.string().describe("The specific variety chosen for that crop.")
  })).describe("The user's chosen crop and variety rotation for the year."),
  language: z.string().describe("The user's preferred language (e.g., 'en', 'hi')."),
});
export type YearLongVarietyPlanInput = z.infer<typeof YearLongVarietyPlanInputSchema>;


const SeasonalPlanSchema = z.object({
    season: z.string().describe("The season (e.g., Kharif)."),
    cropName: z.string().describe("The chosen crop name."),
    variety: z.string().describe("The chosen crop variety."),
    monthlyTimeline: z.array(z.object({
        month: z.string().describe("The month."),
        activity: z.string().describe("The key activities for that month.")
    })).describe("A month-by-month breakdown of activities."),
    fertilizerPlan: z.object({
        inorganic: z.array(ApplicationItemSchema).describe("Inorganic fertilizer schedule."),
        organic: z.array(ApplicationItemSchema).describe("Organic fertilizer schedule.")
    }).describe("The detailed fertilizer and nutrient plan for this specific crop and variety.")
});

export const YearLongVarietyPlanOutputSchema = z.object({
    seasonalPlans: z.array(SeasonalPlanSchema).describe("A list of detailed plans, one for each season in the user's selected crop cycle.")
});
export type YearLongVarietyPlanOutput = z.infer<typeof YearLongVarietyPlanOutputSchema>;


const actionPlanSchema = z.object({
    landPreparation: z.array(z.string()),
    seedSelection: z.array(z.string()),
    irrigationSchedule: z.string(),
    sprayingSchedule: z.string(),
    timeline: z.array(z.object({
        week: z.string(),
        activity: z.string(),
    })),
});

export const CropPlanSchema = z.object({
    id: z.string().optional(),
    userId: z.string(),
    farmId: z.string(),
    cropName: z.string(),
    plan: actionPlanSchema.optional(),
    fertilizerPlan: FertilizerRecommendationOutputSchema.optional().nullable(),
    waterPlan: WaterManagementOutputSchema.optional().nullable(),
    profitSummary: z.object({
        totalRevenue: z.number(),
        totalCost: z.number(),
        netProfit: z.number(),
    }).optional(),
});
export type CropPlan = z.infer<typeof CropPlanSchema>;

export type Scheme = {
  id: string;
  category: 'Central' | 'State';
  state: string;
  lastUpdated: string;
  contact: {
    department: string;
    phone: string;
    email: string;
  };
  website: string;
};

export type PopulatedScheme = Scheme & {
  title: string;
  description: string;
  benefits: string;
  eligibility: string;
  howToApply: string;
  requiredDocuments: string; // Comma-separated
};
