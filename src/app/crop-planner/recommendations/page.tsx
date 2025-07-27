
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/AppLayout';
import type { Farm, CropRecommendationOutput } from '@/lib/types';
import { Loader2, Calendar, Clock, ArrowLeft, CheckCircle, TrendingUp, BadgeCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Recommendation = CropRecommendationOutput['recommendations'][0];

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [farmContext, setFarmContext] = useState<Partial<Farm> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedRecs = localStorage.getItem('cropRecommendations');
      const storedFarm = localStorage.getItem('farmContext');

      if (storedRecs && storedFarm) {
        setRecommendations(JSON.parse(storedRecs));
        setFarmContext(JSON.parse(storedFarm));
      } else {
        toast({ title: "No data found", description: "Please go back and generate recommendations first.", variant: "destructive" });
        router.push('/crop-planner');
      }
    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
      toast({ title: "Error", description: "Could not load recommendations.", variant: "destructive" });
      router.push('/crop-planner');
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);
  
  const recommendationsWithProfit = useMemo(() => {
    if (!recommendations.length || !farmContext?.size) return [];
    
    return recommendations.map(rec => {
        const totalCost = Object.values(rec.estimatedCosts).reduce((sum, cost) => sum + cost, 0);
        const totalRevenue = rec.estimatedYield * rec.estimatedSellingPrice;
        const netProfitPerUnit = totalRevenue - totalCost;
        const totalNetProfit = netProfitPerUnit * farmContext.size;
        return { ...rec, totalNetProfit };
    });

  }, [recommendations, farmContext]);


  const handleSelectCrop = (rec: Recommendation) => {
    try {
      localStorage.setItem('selectedCropPlan', JSON.stringify(rec));
      router.push('/crop-planner/recommendations/plan');
    } catch (error) {
      console.error("Failed to save selected plan to localStorage", error);
      toast({ title: "Error", description: "Could not select this plan. Please try again.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <AppLayout title="Loading..."><div className="text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/></div></AppLayout>;
  }

  return (
    <AppLayout title="Crop Recommendations">
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.push('/crop-planner')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Planner
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Choose a Recommended Option</CardTitle>
            <CardDescription>Based on your input, here are the top AI-powered suggestions. The best fit for your farm is highlighted.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
           {recommendationsWithProfit.length > 0 ? (
             <div className="grid gap-6 md:grid-cols-2">
                {recommendationsWithProfit.map(rec => (
                    <Card 
                        key={rec.cropName} 
                        className={cn(
                          "flex flex-col hover:shadow-lg transition-all rounded-xl", 
                           rec.isBestFit && "border-primary border-2 shadow-primary/20 relative"
                        )}
                    >
                        {rec.isBestFit && (
                           <Badge className="w-fit self-start mt-4 ml-4 z-10 gap-1.5 bg-primary/90 backdrop-blur-lg"><BadgeCheck className="h-3.5 w-3.5"/>Best Fit</Badge>
                        )}
                        <div className="z-0 flex flex-col flex-grow p-5 pt-2">
                          <CardHeader className="p-0">
                              <CardTitle className="text-lg">{rec.cropName}</CardTitle>
                              <CardDescription className="text-xs pt-1">{rec.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4 flex-grow p-0 mt-4">
                              <div className="p-3 rounded-md bg-background">
                                  <p className="text-xs text-foreground/80 flex items-center gap-2"><TrendingUp/>Estimated Net Profit</p>
                                  <p className="text-xl font-bold text-green-600">
                                      ₹{rec.totalNetProfit.toLocaleString('en-IN')}
                                      <span className="text-xs font-normal text-muted-foreground"> for {farmContext?.size} {farmContext?.sizeUnit}</span>
                                  </p>
                              </div>
                              <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Why this?</span> {rec.reason}</p>
                              <div className="flex items-center text-xs text-muted-foreground gap-4">
                                  <span><Calendar className="inline h-4 w-4 mr-1"/>{rec.sowingMonth}</span>
                                  <span><Clock className="inline h-4 w-4 mr-1"/>{rec.estimatedDuration}</span>
                              </div>
                              <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Market:</span> {rec.marketSuitability}</p>
                          </CardContent>
                          <CardFooter className="p-0 mt-4">
                              <Button className="w-full" onClick={() => handleSelectCrop(rec)}>
                                  <CheckCircle className="mr-2 h-4 w-4" /> View Action Plan
                              </Button>
                          </CardFooter>
                        </div>
                    </Card>
                ))}
            </div>
           ): (
             <div className="text-center py-10">
                <p>No recommendations could be generated. Please try adjusting your criteria.</p>
             </div>
           )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
