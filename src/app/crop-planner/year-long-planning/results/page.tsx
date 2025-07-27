
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/AppLayout';
import type { YearLongPlannerInput, SeasonalRecommendations, CropCycleRecommendation } from '@/lib/types';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle, IndianRupee, Wheat, Sun, Cloud, Calendar, SkipForward, BadgeCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const seasonIcons: { [key in keyof SeasonalRecommendations]: React.ReactNode } = {
    kharif: <Cloud className="h-6 w-6 text-blue-500" />,
    rabi: <Wheat className="h-6 w-6 text-yellow-600" />,
    zaid: <Sun className="h-6 w-6 text-orange-500" />,
};

const seasonOrder: (keyof SeasonalRecommendations)[] = ['kharif', 'rabi', 'zaid'];

export default function YearLongPlanResultsPage() {
    const [recommendations, setRecommendations] = useState<SeasonalRecommendations | null>(null);
    const [context, setContext] = useState<YearLongPlannerInput | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selections, setSelections] = useState<{ [key: string]: string }>({});
    const [currentSeasonIndex, setCurrentSeasonIndex] = useState(0);

    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        try {
            const storedRecs = localStorage.getItem('yearLongPlanResult');
            const storedContext = localStorage.getItem('yearLongPlanContext');
            if (storedRecs && storedContext) {
                setRecommendations(JSON.parse(storedRecs));
                setContext(JSON.parse(storedContext));
            } else {
                toast({ title: "No plan found", description: "Please generate a plan first.", variant: "destructive" });
                router.push('/crop-planner/year-long-planning');
            }
        } catch (error) {
            console.error("Failed to parse data from localStorage", error);
        } finally {
            setIsLoading(false);
        }
    }, [router, toast]);

    const orderedSeasons = useMemo(() => {
        if (!context) return [];
        const startMonthIndex = new Date(`${context.startMonth} 1, 2023`).getMonth();
        if (startMonthIndex >= 5 && startMonthIndex <= 9) return ['kharif', 'rabi', 'zaid']; // June-Oct
        if (startMonthIndex >= 10 || startMonthIndex <= 2) return ['rabi', 'zaid', 'kharif']; // Nov-Mar
        return ['zaid', 'kharif', 'rabi']; // Apr-May
    }, [context]);

    const currentSeasonKey = orderedSeasons[currentSeasonIndex];
    const seasonRecommendations = recommendations?.[currentSeasonKey] || [];
    
    const recommendationsWithProfit = useMemo(() => {
        if (!seasonRecommendations.length || !context?.landArea) return [];

        return seasonRecommendations.map(rec => {
            const totalCost = rec.estimatedCosts ? Object.values(rec.estimatedCosts).reduce((sum, cost) => sum + cost, 0) : 0;
            const totalRevenue = (rec.estimatedYield || 0) * (rec.estimatedSellingPrice || 0);
            const netProfitPerUnit = totalRevenue - totalCost;
            const totalNetProfit = netProfitPerUnit * context.landArea;
            return { ...rec, totalNetProfit };
        });
    }, [seasonRecommendations, context]);

    const handleSelection = (season: keyof SeasonalRecommendations, cropName: string) => {
        setSelections(prev => ({ ...prev, [season]: cropName }));
    };

    const handleNext = () => {
        if (!selections[currentSeasonKey]) {
            toast({ title: "Selection Required", description: `Please select a crop for the ${currentSeasonKey} season or choose to leave it vacant.`, variant: "destructive"});
            return;
        }
        if (currentSeasonIndex < orderedSeasons.length - 1) {
            setCurrentSeasonIndex(prev => prev + 1);
        } else {
            // All seasons selected, proceed to the final plan page
            localStorage.setItem('yearLongPlanSelections', JSON.stringify(selections));
            router.push('/crop-planner/year-long-planning/plan');
        }
    };
    
    const handleBack = () => {
        if (currentSeasonIndex > 0) {
            setCurrentSeasonIndex(prev => prev - 1);
        } else {
            router.push('/crop-planner/year-long-planning');
        }
    }

    if (isLoading || !recommendations || !context || orderedSeasons.length === 0) {
        return <AppLayout title="Loading..."><div className="text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div></AppLayout>;
    }
    
    const isLastSeason = currentSeasonIndex === orderedSeasons.length - 1;

    return (
        <AppLayout title="Year-Long Crop Plan">
            <div className="space-y-6">
                <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> 
                    {currentSeasonIndex > 0 ? 'Back to Previous Season' : 'Back to Planner'}
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Select Your Crop for the <span className="capitalize text-primary">{currentSeasonKey}</span> Season</CardTitle>
                        <CardDescription>Choose one recommended crop or opt to leave the field vacant. The best option is highlighted for you.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                         <div>
                            <div className="flex items-center gap-3 mb-4">
                                {seasonIcons[currentSeasonKey]}
                                <div>
                                    <h3 className="text-xl font-semibold capitalize">{currentSeasonKey} Season</h3>
                                </div>
                            </div>
                            <RadioGroup value={selections[currentSeasonKey]} onValueChange={(val) => handleSelection(currentSeasonKey, val)} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {recommendationsWithProfit.map((rec: CropCycleRecommendation & { totalNetProfit: number }) => (
                                    <Label key={rec.cropName} htmlFor={`${currentSeasonKey}-${rec.cropName}`} className="block">
                                        <RadioGroupItem value={rec.cropName} id={`${currentSeasonKey}-${rec.cropName}`} className="sr-only" />
                                        <Card className={cn(
                                            'cursor-pointer h-full hover:border-primary transition-all flex flex-col',
                                            selections[currentSeasonKey] === rec.cropName && 'border-2 border-primary shadow-lg',
                                            rec.isBestFit && 'border-primary border-2 shadow-primary/20'
                                        )}>
                                            <CardHeader>
                                                {rec.isBestFit && <Badge className="w-fit mb-2 gap-1.5"><BadgeCheck className="h-3.5 w-3.5"/>Best Fit</Badge>}
                                                <CardTitle className="text-lg">{rec.cropName}</CardTitle>
                                                <CardDescription>{rec.variety}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-2 text-sm flex-grow">
                                                <p><span className="font-semibold">Duration:</span> {rec.duration}</p>
                                                <p className="text-xs text-muted-foreground">{rec.reason}</p>
                                            </CardContent>
                                            <CardFooter>
                                                 <div className="text-left">
                                                    <p className="text-xs text-muted-foreground">Est. Net Profit</p>
                                                    <p className="font-semibold text-green-600 flex items-center gap-1"><IndianRupee className="h-4 w-4" />
                                                        {rec.totalNetProfit.toLocaleString('en-IN')}
                                                        <span className="text-xs font-normal text-muted-foreground">for {context.landArea} {context.landAreaUnit}</span>
                                                    </p>
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    </Label>
                                ))}
                                <Label htmlFor={`${currentSeasonKey}-none`} className="block">
                                    <RadioGroupItem value="none" id={`${currentSeasonKey}-none`} className="sr-only" />
                                    <Card className={cn('cursor-pointer h-full hover:border-primary transition-all flex items-center justify-center min-h-[200px] bg-muted/50', selections[currentSeasonKey] === 'none' && 'border-2 border-primary shadow-lg')}>
                                        <div className="text-center text-muted-foreground">
                                            <SkipForward className="h-8 w-8 mx-auto" />
                                            <p className="mt-2 font-semibold">Leave Field Vacant</p>
                                            <p className="text-xs">Allow soil to rest</p>
                                        </div>
                                    </Card>
                                </Label>
                            </RadioGroup>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleNext}>
                            {isLastSeason ? 'Generate Final Plan' : 'Next Season'} <ArrowRight className="ml-2 h-4 w-4"/>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </AppLayout>
    );
}
