
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/AppLayout';
import type { YearLongPlannerInput, SeasonalRecommendations, CropCycleRecommendation, YearLongVarietyPlanOutput } from '@/lib/types';
import { Loader2, ArrowLeft, Wheat, Sun, Cloud, Calendar, Sprout, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYearLongVarietyPlan } from '@/ai/flows/year-long-variety-plan';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';


const seasonIcons: { [key in keyof SeasonalRecommendations]: React.ReactNode } = {
    kharif: <Cloud className="h-6 w-6 text-blue-500" />,
    rabi: <Wheat className="h-6 w-6 text-yellow-600" />,
    zaid: <Sun className="h-6 w-6 text-orange-500" />,
};

type Selections = { [key: string]: string };

export default function YearLongFinalPlanPage() {
    const [recommendations, setRecommendations] = useState<SeasonalRecommendations | null>(null);
    const [context, setContext] = useState<YearLongPlannerInput | null>(null);
    const [selections, setSelections] = useState<Selections>({});
    const [varietySelections, setVarietySelections] = useState<Selections>({});
    const [finalPlan, setFinalPlan] = useState<YearLongVarietyPlanOutput | null>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const isHindi = user?.language === 'hi';

    useEffect(() => {
        try {
            const storedRecs = localStorage.getItem('yearLongPlanResult');
            const storedContext = localStorage.getItem('yearLongPlanContext');
            const storedSelections = localStorage.getItem('yearLongPlanSelections');

            if (storedRecs && storedContext && storedSelections) {
                setRecommendations(JSON.parse(storedRecs));
                setContext(JSON.parse(storedContext));
                setSelections(JSON.parse(storedSelections));
            } else {
                toast({ title: "Missing data", description: "Please start the planning process again.", variant: "destructive" });
                router.push('/crop-planner/year-long-planning');
            }
        } catch (error) {
            console.error("Failed to parse data from localStorage", error);
        } finally {
            setIsLoading(false);
        }
    }, [router, toast]);
    
    const handleVarietySelection = (season: string, variety: string) => {
        setVarietySelections(prev => ({...prev, [season]: variety}));
    }

    const generateFinalPlan = async () => {
        if (!user) {
            toast({ title: "User not found", variant: "destructive"});
            return;
        }

        const hasMissingVariety = Object.entries(selections).some(([season, crop]) => crop !== 'none' && !varietySelections[season]);
        if (hasMissingVariety) {
            toast({ title: "Variety Selection Required", description: "Please select a variety for each chosen crop.", variant: "destructive"});
            return;
        }

        setIsGenerating(true);
        setFinalPlan(null);

        const chosenCrops = Object.entries(selections)
            .filter(([, crop]) => crop !== 'none')
            .map(([season, crop]) => ({
                season: season,
                cropName: crop,
                variety: varietySelections[season],
            }));
            
        try {
            const result = await getYearLongVarietyPlan({
                farm: context!,
                cropCycle: chosenCrops,
                language: user.language,
            });
            setFinalPlan(result);
        } catch (error) {
            console.error("Error generating final plan:", error);
            toast({ title: "AI Error", description: "Could not generate the final detailed plan.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    }

    if (isLoading || !context || !recommendations) {
        return <AppLayout title="Loading..."><div className="text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div></AppLayout>;
    }

    const allVarietiesSelected = Object.entries(selections).every(([season, crop]) => crop === 'none' || !!varietySelections[season]);

    return (
        <AppLayout title="Final Year-Long Plan">
            <div className="space-y-6">
                <Button variant="outline" onClick={() => router.push('/crop-planner/year-long-planning/results')}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Crop Selection</Button>
                
                {!finalPlan ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Crop Varieties</CardTitle>
                            <CardDescription>Choose a specific variety for each crop you selected. This will be used to generate the final detailed plan.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {Object.entries(selections).map(([season, cropName]) => {
                                if (cropName === 'none') return null;
                                const cropRec = recommendations[season as keyof typeof recommendations]?.find(r => r.cropName === cropName);
                                // Simple mock for variety choices - a real app might fetch this
                                const varietyOptions = [`${cropRec?.variety || 'Generic'} 1`, `${cropRec?.variety || 'Generic'} 2`, `High-Yield ${cropName}`];

                                return (
                                    <div key={season} className="p-4 rounded-lg border flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground capitalize">{season} Season</p>
                                            <h3 className="text-lg font-semibold">{cropName}</h3>
                                        </div>
                                        <div className="w-1/2">
                                            <Select onValueChange={(v) => handleVarietySelection(season, v)}>
                                                <SelectTrigger><SelectValue placeholder="Select a variety..."/></SelectTrigger>
                                                <SelectContent>
                                                    {varietyOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )
                            })}
                        </CardContent>
                        <CardFooter>
                            <Button onClick={generateFinalPlan} disabled={isGenerating}>
                                {isGenerating ? <Loader2 className="animate-spin mr-2"/> : <Calendar className="mr-2"/>}
                                Generate Detailed Plan
                            </Button>
                        </CardFooter>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                             <CardTitle>Your Annual Crop &amp; Nutrient Calendar</CardTitle>
                            <CardDescription>A detailed, step-by-step guide for your entire crop year.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {finalPlan.seasonalPlans.map(plan => (
                                <div key={plan.season} className="relative border-l-2 border-dashed pl-8 py-4">
                                     <div className="absolute -left-[1.2rem] top-4 z-10 bg-background p-2 rounded-full border-2">
                                        {seasonIcons[plan.season as keyof typeof seasonIcons]}
                                     </div>

                                    <div className="mb-6">
                                        <h2 className="text-2xl font-bold capitalize text-primary">{plan.season} Season: {plan.cropName} ({plan.variety})</h2>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2 text-lg"><Sprout/>Monthly Activity Calendar</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                 <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Month</TableHead>
                                                            <TableHead>Key Activities</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {plan.monthlyTimeline.map(month => (
                                                            <TableRow key={month.month}>
                                                                <TableCell className="font-semibold">{month.month}</TableCell>
                                                                <TableCell>{month.activity}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                        
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2 text-lg"><Target/>Fertilizer &amp; Nutrient Schedule</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Tabs defaultValue="inorganic">
                                                    <TabsList className="grid grid-cols-2 w-full">
                                                        <TabsTrigger value="inorganic">Inorganic Plan</TabsTrigger>
                                                        <TabsTrigger value="organic">Organic Plan</TabsTrigger>
                                                    </TabsList>
                                                    <TabsContent value="inorganic" className="mt-4">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Stage</TableHead>
                                                                    <TableHead>Fertilizer</TableHead>
                                                                    <TableHead>Quantity/Acre</TableHead>
                                                                    <TableHead>Method</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {plan.fertilizerPlan.inorganic.map((item, i) => (
                                                                    <TableRow key={i}>
                                                                        <TableCell>{item.applicationStage}</TableCell>
                                                                        <TableCell>{item.fertilizerName}</TableCell>
                                                                        <TableCell>{item.quantity}</TableCell>
                                                                        <TableCell>{item.applicationMethod}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TabsContent>
                                                    <TabsContent value="organic" className="mt-4">
                                                          <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Stage</TableHead>
                                                                    <TableHead>Fertilizer</TableHead>
                                                                    <TableHead>Quantity/Acre</TableHead>
                                                                    <TableHead>Method</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {plan.fertilizerPlan.organic.map((item, i) => (
                                                                    <TableRow key={i}>
                                                                        <TableCell>{item.applicationStage}</TableCell>
                                                                        <TableCell>{item.fertilizerName}</TableCell>
                                                                        <TableCell>{item.quantity}</TableCell>
                                                                        <TableCell>{item.applicationMethod}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TabsContent>
                                                </Tabs>
                                            </CardContent>
                                        </Card>
                                    </div>

                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
