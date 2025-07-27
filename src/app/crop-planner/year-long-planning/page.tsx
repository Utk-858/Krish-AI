
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/AppLayout';
import type { YearLongPlannerInput } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Locate, ChevronsUpDown, Calendar, X, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { VoiceInput } from '@/components/VoiceInput';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { getLocationName } from '@/services/weather';
import { getYearLongPlan } from '@/ai/flows/year-long-planner';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const allMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const soilTypes = ["Alluvial Soil", "Black Soil", "Red and Yellow Soil", "Laterite Soil", "Arid Soil", "Saline Soil", "Peaty Soil", "Forest Soil", "Loamy Soil", "Sandy Soil", "Clay Soil"];
const irrigationSystems = ["Rainfed", "Canal Irrigation", "Drip Irrigation", "Sprinkler Irrigation", "Tube Well", "Dug Well", "Tank Irrigation"];
const commonCrops = ["Rice", "Wheat", "Maize", "Bajra", "Tur", "Urad", "Moong", "Sugarcane", "Cotton", "Mustard", "Jowar", "Groundnut", "Soybean", "Gram", "Potato", "Onion", "Tomato"];

export default function YearLongPlanningPage() {
    const [formData, setFormData] = useState<YearLongPlannerInput>({
        location: '',
        startMonth: '',
        landArea: 5,
        landAreaUnit: 'acres',
        soilType: '',
        irrigation: [],
        preferredCrops: [],
        language: 'en'
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [otherCrop, setOtherCrop] = useState('');

    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const isHindi = user?.language === 'hi';

    useEffect(() => {
        if (user) {
            setFormData(prev => ({ 
                ...prev, 
                location: user.location,
                language: user.language
            }));
        }
    }, [user]);

    const handleFormChange = (field: keyof YearLongPlannerInput, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const handleMultiSelectChange = (field: 'irrigation' | 'preferredCrops', item: string, checked: boolean) => {
        setFormData(prev => {
            const currentItems = prev[field] as string[] || [];
            let newItems;
            if (checked) {
                newItems = [...currentItems, item];
            } else {
                newItems = currentItems.filter(i => i !== item);
            }
            return { ...prev, [field]: newItems };
        });
    };

    const addOtherCrop = () => {
        if(otherCrop && !formData.preferredCrops?.includes(otherCrop)) {
            handleMultiSelectChange('preferredCrops', otherCrop, true);
            setOtherCrop('');
        }
    }

    const handleGetPlan = async () => {
        if (!formData.location || !formData.startMonth || !formData.soilType || formData.irrigation.length === 0) {
            toast({ title: "Missing Information", description: "Please fill out all required fields.", variant: "destructive" });
            return;
        }
        setIsGenerating(true);
        try {
            const result = await getYearLongPlan(formData);
            localStorage.setItem('yearLongPlanResult', JSON.stringify(result));
            localStorage.setItem('yearLongPlanContext', JSON.stringify(formData));
            router.push('/crop-planner/year-long-planning/results');
        } catch (error) {
            console.error("Error generating year-long plan:", error);
            toast({ title: "AI Error", description: "Could not generate the plan.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleUseGPS = () => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const locationName = await getLocationName(latitude, longitude);
                if (locationName) handleFormChange('location', locationName);
            },
            (error) => toast({ title: "Could not get location", description: error.message, variant: "destructive" })
        );
    };

    return (
        <AppLayout title="Year-Long Crop Planning">
            <div className="max-w-4xl mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Plan Your Year</CardTitle>
                        <CardDescription>Enter your farm's details to generate an optimized, year-long crop rotation plan.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Location*</Label>
                                <div className="flex items-center gap-2">
                                    <VoiceInput value={formData.location} onValueChange={(v) => handleFormChange('location', v)} fieldName="Location">
                                        <Input value={formData.location} onChange={e => handleFormChange('location', e.target.value)} placeholder="e.g. Pune, Maharashtra" />
                                    </VoiceInput>
                                    <Button type="button" size="icon" variant="outline" onClick={handleUseGPS}><Locate className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Cycle Start Month*</Label>
                                <Select onValueChange={(v) => handleFormChange('startMonth', v)} value={formData.startMonth}>
                                    <SelectTrigger><SelectValue placeholder="Select a month" /></SelectTrigger>
                                    <SelectContent>{allMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Land Area*</Label>
                                <div className="flex gap-2">
                                    <Input type="number" value={formData.landArea} onChange={e => handleFormChange('landArea', Number(e.target.value))} />
                                    <Select onValueChange={(v) => handleFormChange('landAreaUnit', v)} value={formData.landAreaUnit}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="acres">Acres</SelectItem>
                                            <SelectItem value="hectares">Hectares</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Soil Type*</Label>
                                <Select onValueChange={(v) => handleFormChange('soilType', v)} value={formData.soilType}>
                                    <SelectTrigger><SelectValue placeholder="Select soil type" /></SelectTrigger>
                                    <SelectContent>{soilTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Irrigation Systems*</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between font-normal">
                                            {formData.irrigation.length > 0 ? `${formData.irrigation.length} selected` : 'Select systems'}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
                                        <div className="space-y-2">
                                            {irrigationSystems.map(s => (
                                                <div key={s} className="flex items-center space-x-2 p-2 rounded hover:bg-muted">
                                                    <Checkbox id={`irrigation-${s}`} checked={formData.irrigation.includes(s)} onCheckedChange={(c) => handleMultiSelectChange('irrigation', s, !!c)} />
                                                    <Label htmlFor={`irrigation-${s}`} className="font-normal">{s}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Preferred Crops (Optional)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between font-normal h-auto min-h-10">
                                            <div className="flex flex-wrap gap-1">
                                                {formData.preferredCrops!.length > 0 ? formData.preferredCrops!.map(c => <Badge key={c} variant="secondary">{c}</Badge>) : 'Select preferred crops'}
                                            </div>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                       <Command>
                                            <CommandInput placeholder="Search crops..." />
                                            <CommandList>
                                                <CommandEmpty>No results found.</CommandEmpty>
                                                <CommandGroup>
                                                    {commonCrops.map(c => (
                                                        <CommandItem key={c} onSelect={() => handleMultiSelectChange('preferredCrops', c, !formData.preferredCrops?.includes(c))}>
                                                             <Checkbox className="mr-2" checked={formData.preferredCrops?.includes(c)} />
                                                            {c}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                       </Command>
                                        <div className="p-2 border-t flex gap-2">
                                            <Input placeholder="Add other crop..." value={otherCrop} onChange={(e) => setOtherCrop(e.target.value)} />
                                            <Button size="sm" onClick={addOtherCrop}>Add</Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleGetPlan} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate Year-Long Plan
                        </Button>
                    </CardFooter>
                </Card>
                {isGenerating && (
                    <div className="fixed inset-0 bg-background/80 flex flex-col justify-center items-center z-50">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="mt-4 text-lg text-muted-foreground">Our AI is crafting your annual plan...</p>
                        <p className="text-sm text-muted-foreground">This may take a moment.</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
