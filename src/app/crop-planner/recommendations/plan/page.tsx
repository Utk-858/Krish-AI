
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/AppLayout';
import type { Farm, CropPlan, CropRecommendationOutput, SoilHealthCard, FertilizerRecommendationOutput, WaterManagementOutput, PestDiseaseForecastOutput } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Calculator, ChevronsUpDown, Wind, Leaf, Droplets, Target, Calendar as CalendarIcon, ArrowLeft, Thermometer, Droplets as DropletsIcon, Sprout, Milestone, AlertTriangle, ShieldCheck, Beaker, Gavel, IndianRupee, MapPin, Bug, Phone, Locate, Atom, Info, ExternalLink, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { VoiceInput } from '@/components/VoiceInput';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { findSuppliers, type FindSuppliersOutput } from '@/ai/flows/find-suppliers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { getLocationName } from '@/services/weather';
import { getFertilizerRecommendations } from '@/ai/flows/fertilizer-recommendation';
import { getWaterManagementPlan } from '@/ai/flows/water-management';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPestDiseaseForecast } from '@/ai/flows/pest-and-disease-forecast';
import Image from 'next/image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type Recommendation = CropRecommendationOutput['recommendations'][0];
type Supplier = FindSuppliersOutput['suppliers'][0];

const riskColorMap = {
    'Low': 'border-l-green-500 bg-green-500/10',
    'Medium': 'border-l-yellow-500 bg-yellow-500/10',
    'High': 'border-l-red-500 bg-red-500/10',
};

const overviewIcons: { [key: string]: React.ComponentType<{ className?: string }> } = {
    bestSeason: CalendarIcon,
    harvestDuration: Milestone,
    recommendedLandType: Sprout,
    seedRate: Gavel,
    irrigationNeeds: Droplets,
    estimatedWaterUsage: DropletsIcon,
    seedTreatment: ShieldCheck,
};

const shcFields: { key: keyof SoilHealthCard, label: string, placeholder: string }[] = [
    { key: 'ph', label: 'Soil pH', placeholder: 'e.g., 7.2' },
    { key: 'organic_carbon', label: 'Organic Carbon (%)', placeholder: 'e.g., 0.6' },
    { key: 'nitrogen', label: 'Nitrogen (N) (kg/ha)', placeholder: 'e.g., 280' },
    { key: 'phosphorus', label: 'Phosphorus (P) (kg/ha)', placeholder: 'e.g., 25' },
    { key: 'potassium', label: 'Potassium (K) (kg/ha)', placeholder: 'e.g., 150' },
];

export default function PlanPage() {
  const [selectedCrop, setSelectedCrop] = useState<Recommendation | null>(null);
  const [farmContext, setFarmContext] = useState<Partial<Farm> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFindingSuppliers, setIsFindingSuppliers] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearchLocation, setSupplierSearchLocation] = useState('');

  // Fertilizer state
  const [showFertilizerForm, setShowFertilizerForm] = useState(false);
  const [shcData, setShcData] = useState<SoilHealthCard>({ ph: 0, organic_carbon: 0, nitrogen: 0, phosphorus: 0, potassium: 0 });
  const [isGettingFertilizerPlan, setIsGettingFertilizerPlan] = useState(false);
  const [fertilizerPlan, setFertilizerPlan] = useState<FertilizerRecommendationOutput | null>(null);

  // Water plan state
  const [isGettingWaterPlan, setIsGettingWaterPlan] = useState(false);
  const [waterPlan, setWaterPlan] = useState<WaterManagementOutput | null>(null);

  // Pest & Disease state
  const [isGettingPestForecast, setIsGettingPestForecast] = useState(false);
  const [pestForecast, setPestForecast] = useState<PestDiseaseForecastOutput | null>(null);

  // State for profit calculator
  const [costs, setCosts] = useState({ seed: 0, fertilizer: 0, pesticide: 0, labor: 0, irrigation: 0, other: 0 });
  const [yieldEstimate, setYieldEstimate] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);

  const { firebaseUser, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const isHindi = user?.language === 'hi';

  useEffect(() => {
    try {
      const storedPlan = localStorage.getItem('selectedCropPlan');
      const storedFarm = localStorage.getItem('farmContext');
      if (storedPlan && storedFarm) {
        const plan = JSON.parse(storedPlan);
        const farm = JSON.parse(storedFarm);
        setSelectedCrop(plan);
        setFarmContext(farm);
        setSupplierSearchLocation(farm.location || '');

        if (plan.estimatedCosts) {
            setCosts({
                seed: plan.estimatedCosts.seed,
                fertilizer: plan.estimatedCosts.fertilizer,
                pesticide: plan.estimatedCosts.pesticide,
                labor: plan.estimatedCosts.labor,
                irrigation: plan.estimatedCosts.irrigation,
                other: 0,
            });
        }
        if (plan.estimatedYield) {
            setYieldEstimate(plan.estimatedYield);
        }
        if (plan.estimatedSellingPrice) {
            setSellingPrice(plan.estimatedSellingPrice);
        }

      } else {
        toast({ title: "No plan found", description: "Please select a recommendation first.", variant: "destructive" });
        router.push('/crop-planner/recommendations');
      }
    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
      toast({ title: "Error", description: "Could not load the plan.", variant: "destructive" });
      router.push('/crop-planner/recommendations');
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);
  
  const totalCost = useMemo(() => Object.values(costs).reduce((sum, cost) => sum + cost, 0), [costs]);
  const totalRevenue = useMemo(() => yieldEstimate * sellingPrice, [yieldEstimate, sellingPrice]);
  const netProfit = useMemo(() => totalRevenue - totalCost, [totalRevenue, totalCost]);

  const handleDownload = async (content: any, title: string) => {
    const doc = new jsPDF();
    
    // Create a hidden element to render the content for PDF conversion
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.padding = '20px';
    container.style.width = '600px';
    container.style.fontFamily = 'Helvetica';

    let htmlContent = `<h1>${title}</h1>`;

    const formatContent = (data: any): string => {
        if (typeof data === 'string') return `<p>${data}</p>`;
        if (Array.isArray(data)) {
            return `<ul>${data.map(item => `<li>${formatContent(item)}</li>`).join('')}</ul>`;
        }
        if (typeof data === 'object' && data !== null) {
            return `<ul>${Object.entries(data).map(([key, value]) => `<li><strong>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> ${formatContent(value)}</li>`).join('')}</ul>`;
        }
        return String(data);
    };

    htmlContent += formatContent(content);
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    try {
        const canvas = await html2canvas(container, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${title.toLowerCase().replace(/\s/g, '-')}.pdf`);

    } catch(error) {
        console.error("Error generating PDF:", error);
        toast({ title: "PDF Error", description: "Could not generate the PDF file.", variant: "destructive" });
    } finally {
        document.body.removeChild(container);
    }
  };


  const handleSavePlan = async () => {
    if (!firebaseUser || !selectedCrop || !farmContext) return;
    setIsSaving(true);
    try {
        const cropPlan: CropPlan = {
            userId: firebaseUser.uid,
            farmId: farmContext.id || 'manual',
            cropName: selectedCrop.cropName,
            plan: selectedCrop.plan,
            fertilizerPlan: fertilizerPlan,
            waterPlan: waterPlan,
            profitSummary: { totalRevenue, totalCost, netProfit },
        };
        await addDoc(collection(db, 'cropPlans'), cropPlan);
        toast({ title: "Success", description: "Crop plan saved successfully."});
    } catch (error) {
        console.error("Error saving plan:", error);
        toast({ title: "Error", description: "Could not save the crop plan.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  }
  
  const { totalSeedRequired, seedRateUnit } = useMemo(() => {
    if (!selectedCrop?.cropOverview?.seedRate || !farmContext?.size) {
        return { totalSeedRequired: 0, seedRateUnit: '' };
    }
    const seedRateString = selectedCrop.cropOverview.seedRate;
    // Extracts the first number from a string like "20-25 kg/acre" -> 20
    const ratePerUnit = parseFloat(seedRateString.match(/[\d\.]+/)?.[0] || '0');
    // Extracts the unit like "kg/acre"
    const unitMatch = seedRateString.match(/[a-zA-Z]+\/[a-zA-Z]+/);
    const unit = unitMatch ? unitMatch[0] : 'kg';

    return { 
        totalSeedRequired: ratePerUnit * farmContext.size,
        seedRateUnit: unit,
    };
  }, [selectedCrop, farmContext]);
  
  const totalSeedCost = useMemo(() => {
    if (!selectedCrop?.estimatedCosts?.seed || !farmContext?.size) return 0;
    return selectedCrop.estimatedCosts.seed * farmContext.size;
  }, [selectedCrop, farmContext]);

  const handleFindSuppliers = async (location: string) => {
    if (!location) {
        toast({ title: "Location not found", description: "A location is needed to find suppliers.", variant: "destructive" });
        return;
    }
    setIsFindingSuppliers(true);
    setSuppliers([]); // Clear previous results
    try {
        const result = await findSuppliers({ location });
        setSuppliers(result.suppliers);
    } catch (error) {
        console.error("Error finding suppliers:", error);
        toast({ title: "AI Error", description: "Could not find suppliers.", variant: "destructive" });
    } finally {
        setIsFindingSuppliers(false);
    }
  };

  const handleUseGPS = async () => {
    if (!navigator.geolocation) {
        toast({ title: "Geolocation not supported", description: "Your browser does not support GPS location.", variant: "destructive" });
        return;
    }
    
    setIsFindingSuppliers(true);
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            const locationName = await getLocationName(latitude, longitude);
            if(locationName){
                setSupplierSearchLocation(locationName);
                await handleFindSuppliers(locationName);
            } else {
                toast({ title: "Could not get location name", description: "Unable to reverse-geocode your coordinates.", variant: "destructive"});
                setIsFindingSuppliers(false);
            }
        },
        (error) => {
            toast({ title: "Could not get location", description: error.message, variant: "destructive"});
            setIsFindingSuppliers(false);
        }
    );
  };
  
  const handleGetFertilizerPlan = async () => {
    if(!selectedCrop || !farmContext || !user) return;
    setIsGettingFertilizerPlan(true);
    setFertilizerPlan(null);
    try {
        const result = await getFertilizerRecommendations({
            soilHealthCard: shcData,
            cropName: selectedCrop.cropName,
            location: farmContext.location || '',
            language: user.language
        });
        setFertilizerPlan(result);
        setShowFertilizerForm(false);
    } catch(error) {
        console.error("Error getting fertilizer plan:", error);
        toast({ title: "AI Error", description: "Could not generate fertilizer plan.", variant: "destructive" });
    } finally {
        setIsGettingFertilizerPlan(false);
    }
  }

  const handleShcChange = (key: keyof SoilHealthCard, value: string) => {
    setShcData(prev => ({...prev, [key]: Number(value) || 0}));
  }

  const handleGetWaterPlan = async () => {
      if (!farmContext || !selectedCrop || !user) return;
      setIsGettingWaterPlan(true);
      setWaterPlan(null);
      try {
          const result = await getWaterManagementPlan({
              farm: farmContext,
              cropName: selectedCrop.cropName,
              language: user.language
          });
          setWaterPlan(result);
      } catch(error) {
          console.error("Error getting water plan:", error);
          toast({ title: "AI Error", description: "Could not generate water management plan.", variant: "destructive" });
      } finally {
          setIsGettingWaterPlan(false);
      }
  }
  
  const handleGetPestForecast = async () => {
      if (!farmContext || !selectedCrop || !user) return;
      setIsGettingPestForecast(true);
      setPestForecast(null);
      try {
          const result = await getPestDiseaseForecast({
              farm: farmContext,
              cropName: selectedCrop.cropName,
              language: user.language
          });
          setPestForecast(result);
      } catch(error) {
          console.error("Error getting pest forecast:", error);
          toast({ title: "AI Error", description: "Could not generate pest & disease forecast.", variant: "destructive" });
      } finally {
          setIsGettingPestForecast(false);
      }
  }

  if (isLoading || !selectedCrop) {
    return <AppLayout title="Loading Plan..."><div className="text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/></div></AppLayout>;
  }

  return (
    <AppLayout title={`${isHindi ? 'के लिए योजना' : 'Plan for'} ${selectedCrop.cropName}`}>
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> {isHindi ? 'सिफारिशों पर वापस' : 'Back to Recommendations'}
                    </Button>
                    <h1 className="text-3xl font-bold mt-4">{selectedCrop.cropName}</h1>
                    <p className="text-muted-foreground">{farmContext?.location} | {farmContext?.size} {farmContext?.sizeUnit}</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 items-start">
                 {/* Left Column */}
                <div className="space-y-6">
                    {selectedCrop.cropOverview && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>{isHindi ? 'फसल अवलोकन' : 'Crop Overview'}</CardTitle>
                                    <CardDescription>{isHindi ? 'आपकी फसल के लिए मुख्य विवरण एक नज़र में।' : 'Key details for your crop at a glance.'}</CardDescription>
                                </div>
                                <Button variant="outline" size="icon" onClick={() => handleDownload(selectedCrop.cropOverview, 'Crop Overview')}>
                                    <Download className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {Object.entries(selectedCrop.cropOverview).map(([key, value]) => {
                                    const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                    const Icon = overviewIcons[key as keyof typeof overviewIcons] || Sprout;
                                    return (
                                    <div key={key} className="flex items-start gap-3">
                                        <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold">{formattedKey}</p>
                                            <p className="text-sm text-muted-foreground">{String(value)}</p>
                                        </div>
                                    </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    )}

                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{isHindi ? 'कार्य योजना' : 'Action Plan'}</CardTitle>
                                <CardDescription>{isHindi ? 'सफल फसल के लिए इन चरणों का पालन करें।' : 'Follow these steps for a successful harvest.'}</CardDescription>
                            </div>
                             <Button variant="outline" size="icon" onClick={() => handleDownload(selectedCrop.plan, 'Action Plan')}>
                                <Download className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                        <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                            <AccordionItem value="item-1">
                            <AccordionTrigger><Wind className="mr-2 h-5 w-5"/>{isHindi ? 'भूमि की तैयारी' : 'Land Preparation'}</AccordionTrigger>
                            <AccordionContent>
                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                {selectedCrop.plan.landPreparation.map((step, i) => <li key={i}>{step}</li>)}
                                </ul>
                            </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                            <AccordionTrigger><Leaf className="mr-2 h-5 w-5"/>{isHindi ? 'बीज का चयन' : 'Seed Selection'}</AccordionTrigger>
                            <AccordionContent>
                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                {selectedCrop.plan.seedSelection.map((step, i) => <li key={i}>{step}</li>)}
                                </ul>
                            </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                            <AccordionTrigger><Droplets className="mr-2 h-5 w-5"/>{isHindi ? 'सिंचाई अनुसूची' : 'Irrigation Schedule'}</AccordionTrigger>
                            <AccordionContent>
                                <p className="text-muted-foreground">{selectedCrop.plan.irrigationSchedule}</p>
                            </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-4">
                            <AccordionTrigger><Target className="mr-2 h-5 w-5"/>{isHindi ? 'छिड़काव अनुसूची' : 'Spraying Schedule'}</AccordionTrigger>
                            <AccordionContent>
                                <p className="text-muted-foreground">{selectedCrop.plan.sprayingSchedule}</p>
                            </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-5">
                            <AccordionTrigger><CalendarIcon className="mr-2 h-5 w-5"/>{isHindi ? 'फसल समयरेखा' : 'Crop Timeline'}</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-4">
                                {selectedCrop.plan.timeline.map((item, i) => (
                                    <div key={i} className="relative flex items-center justify-between pl-6">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-0.5 bg-border"></div>
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary"></div>
                                    <div className="pl-6">
                                        <p className="font-semibold">{item.week}</p>
                                        <p className="text-muted-foreground">{item.activity}</p>
                                    </div>
                                    </div>
                                ))}
                                </div>
                            </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                        </CardContent>
                    </Card>
                    
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2"><DropletsIcon className="h-5 w-5 text-blue-500" /> {isHindi ? 'जल प्रबंधन योजना' : 'Water Management Plan'}</CardTitle>
                                <CardDescription>{isHindi ? 'आपके विभिन्न जल स्रोतों के लिए विशेष सलाह।' : 'Tailored advice for your different water sources.'}</CardDescription>
                            </div>
                            {waterPlan && (
                                <Button variant="outline" size="icon" onClick={() => handleDownload(waterPlan, 'Water Management Plan')}>
                                    <Download className="h-4 w-4" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {!waterPlan && (
                                <Button className="w-full" onClick={handleGetWaterPlan} disabled={isGettingWaterPlan}>
                                    {isGettingWaterPlan ? <Loader2 className="animate-spin mr-2"/> : null}
                                    {isHindi ? 'जल योजना प्राप्त करें' : 'Get Water Plan'}
                                </Button>
                            )}

                            {isGettingWaterPlan && (
                                <div className="flex justify-center items-center py-4">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                                </div>
                            )}
                            
                            {waterPlan && (
                                <div className="space-y-6">
                                    {waterPlan.waterPlan.map((plan, index) => (
                                        <div key={index} className="p-4 rounded-lg border-l-4 border-primary bg-primary/10">
                                            <h4 className="font-semibold text-lg text-primary">{plan.source}</h4>
                                            <p className="text-sm text-muted-foreground mt-2">{plan.advice}</p>
                                            
                                            <div className="mt-4">
                                                <h5 className="font-semibold mb-2">{isHindi ? 'अनुसूची:' : 'Schedule:'}</h5>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="text-xs">{isHindi ? 'विकास चरण' : 'Growth Stage'}</TableHead>
                                                            <TableHead className="text-xs">{isHindi ? 'आवृत्ति' : 'Frequency'}</TableHead>
                                                            <TableHead className="text-xs">{isHindi ? 'अवधि/मात्रा' : 'Duration/Amount'}</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {plan.schedule.map((s, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell className="font-medium text-xs">{s.growthStage}</TableCell>
                                                                <TableCell className="text-xs">{s.frequency}</TableCell>
                                                                <TableCell className="text-xs">{s.duration}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="outline" onClick={() => setWaterPlan(null)}>
                                        {isHindi ? 'योजना फिर से बनाएं' : 'Regenerate Plan'}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2"><Bug className="h-5 w-5" /> {isHindi ? 'कीट और रोग का पूर्वानुमान' : 'Pest & Disease Forecast'}</CardTitle>
                                <CardDescription>{isHindi ? 'आपके क्षेत्र में आम खतरों को रोकने के लिए एआई सिफारिशें।' : 'AI recommendations for preventing common threats in your area.'}</CardDescription>
                            </div>
                            {pestForecast && (
                                <Button variant="outline" size="icon" onClick={() => handleDownload(pestForecast, 'Pest and Disease Forecast')}>
                                    <Download className="h-4 w-4" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                           {!pestForecast && (
                                <Button className="w-full" onClick={handleGetPestForecast} disabled={isGettingPestForecast}>
                                    {isGettingPestForecast ? <Loader2 className="animate-spin mr-2"/> : null}
                                    {isHindi ? 'कीट और रोग का पूर्वानुमान प्राप्त करें' : 'Get Pest & Disease Forecast'}
                                </Button>
                           )}

                           {isGettingPestForecast && (
                                <div className="flex justify-center items-center py-4">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                                </div>
                           )}

                           {pestForecast && (
                                <div className="space-y-6">
                                    {pestForecast.threats.map((threat, index) => (
                                        <Card key={index} className="overflow-hidden">
                                            <CardHeader>
                                                <div>
                                                    <CardTitle>{threat.name}</CardTitle>
                                                    <CardDescription>{threat.symptoms}</CardDescription>
                                                    <Badge variant={threat.type === 'Pest' ? 'destructive' : 'secondary'} className="mt-2">{threat.type}</Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <Accordion type="single" collapsible className="w-full">
                                                    <AccordionItem value="preventative">
                                                        <AccordionTrigger>{isHindi ? 'निवारक उपाय' : 'Preventative Measures'}</AccordionTrigger>
                                                        <AccordionContent>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="p-3 rounded-md bg-green-500/10">
                                                                    <h4 className="font-semibold text-green-700">{isHindi ? 'जैविक रोकथाम' : 'Organic Prevention'}</h4>
                                                                    <ul className="list-disc pl-4 mt-2 text-sm text-muted-foreground">
                                                                        {threat.preventativeMeasures.organic.map((measure, i) => <li key={i}>{measure}</li>)}
                                                                    </ul>
                                                                </div>
                                                                <div className="p-3 rounded-md bg-red-500/10">
                                                                    <h4 className="font-semibold text-red-700">{isHindi ? 'रासायनिक रोकथाम' : 'Chemical Prevention'}</h4>
                                                                     <ul className="list-disc pl-4 mt-2 text-sm text-muted-foreground">
                                                                        {threat.preventativeMeasures.chemical.map((measure, i) => <li key={i}>{measure}</li>)}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                </Accordion>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    <Button variant="outline" onClick={() => setPestForecast(null)}>
                                        {isHindi ? 'पूर्वानुमान फिर से बनाएं' : 'Regenerate Forecast'}
                                    </Button>
                                </div>
                           )}
                        </CardContent>
                    </Card>
                </div>

                 {/* Right Column */}
                 <div className="space-y-6">
                    {selectedCrop.sowingWindows && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>{isHindi ? 'बुवाई की सर्वोत्तम खिड़कियां' : 'Best Sowing Windows'}</CardTitle>
                                <Button variant="outline" size="icon" onClick={() => handleDownload(selectedCrop.sowingWindows, 'Sowing Windows')}>
                                    <Download className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {selectedCrop.sowingWindows.map((window, index) => (
                                    <div key={index} className={cn('p-4 rounded-lg border-l-4', riskColorMap[window.riskLevel])}>
                                        <div className="flex justify-between items-center mb-1">
                                            <h4 className="font-semibold">{window.dateRange}</h4>
                                            <div className="flex gap-2">
                                                <Badge variant={window.riskLevel === 'Low' ? 'default' : window.riskLevel === 'Medium' ? 'secondary' : 'destructive'}>{window.riskLevel} {isHindi ? 'जोखिम' : 'Risk'}</Badge>
                                                {window.isPmfbyEligible && <Badge variant="outline">{isHindi ? 'पीएमएफबीवाई योग्य' : 'PMFBY Eligible'}</Badge>}
                                            </div>
                                        </div>
                                        <p className="text-sm">{window.description}</p>
                                    </div>
                                ))}
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>{isHindi ? 'बीमा अनुस्मारक (पीएमएफबीवाई)' : 'Insurance Reminder (PMFBY)'}</AlertTitle>
                                    <AlertDescription>{selectedCrop.pmfbyReminder}</AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>{isHindi ? 'बीज अनुमान और सोर्सिंग' : 'Seed Estimation & Sourcing'}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-md bg-muted">
                                    <p className="text-sm text-muted-foreground flex items-center gap-2"><Gavel className="h-5 w-5"/>{isHindi ? 'कुल बीज आवश्यक' : 'Total Seed Required'}</p>
                                    <p className="text-lg font-bold">{totalSeedRequired.toFixed(2)} {seedRateUnit}</p>
                                </div>
                                <div className="p-3 rounded-md bg-muted">
                                    <p className="text-sm text-muted-foreground flex items-center gap-2"><IndianRupee className="h-5 w-5"/>{isHindi ? 'अनुमानित बीज लागत' : 'Estimated Seed Cost'}</p>
                                    <p className="text-lg font-bold">₹{totalSeedCost.toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5"/>{isHindi ? 'अनुशंसित बीज उपचार' : 'Recommended Seed Treatment'}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{selectedCrop.cropOverview.seedTreatment}</p>
                            </div>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button className="w-full" onClick={() => handleFindSuppliers(supplierSearchLocation)} disabled={isFindingSuppliers}>
                                        <MapPin className="mr-2 h-4 w-4"/>
                                        {isHindi ? 'आस-पास के आपूर्तिकर्ताओं को खोजें' : 'Find Nearby Suppliers'}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{isHindi ? 'आस-पास के आपूर्तिकर्ता' : 'Nearby Suppliers'}</DialogTitle>
                                        <DialogDescription>
                                           {isHindi ? 'आपूर्तिकर्ताओं को खोजने के लिए अपना स्थान दर्ज करें। सटीकता के लिए आप अपने डिवाइस के जीपीएस का भी उपयोग कर सकते हैं।' : 'Enter your location to find suppliers. You can also use your device\'s GPS for accuracy.'}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="flex gap-2 items-center">
                                            <Input 
                                                value={supplierSearchLocation}
                                                onChange={(e) => setSupplierSearchLocation(e.target.value)}
                                                placeholder="e.g. Pune, Maharashtra"
                                            />
                                            <Button type="button" size="icon" variant="outline" onClick={handleUseGPS}><Locate className="h-4 w-4"/></Button>
                                        </div>
                                         <Button className="w-full" onClick={() => handleFindSuppliers(supplierSearchLocation)} disabled={isFindingSuppliers}>
                                            {isFindingSuppliers ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                            {isHindi ? 'खोजें' : 'Search'}
                                        </Button>
                                    </div>

                                    <div className="max-h-60 overflow-y-auto space-y-4 p-1 mt-4">
                                        {isFindingSuppliers ? (
                                            <div className="flex justify-center items-center h-24">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                                            </div>
                                        ) : suppliers.length > 0 ? (
                                            suppliers.map((supplier, index) => (
                                                <div key={index} className="p-4 border rounded-lg">
                                                    <h3 className="font-semibold text-lg">{supplier.name}</h3>
                                                    <p className="text-sm text-muted-foreground flex items-start gap-2 mt-2">
                                                        <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                                                        <span>{supplier.address}</span>
                                                    </p>
                                                    {supplier.phone && (
                                                         <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                                            <Phone className="h-4 w-4" />
                                                            <a href={`tel:${supplier.phone}`} className="hover:underline">{supplier.phone}</a>
                                                        </p>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-muted-foreground py-4">{isHindi ? 'कोई आपूर्तिकर्ता नहीं मिला। किसी पास के शहर की खोज करने या जीपीएस का उपयोग करने का प्रयास करें।' : 'No suppliers found. Try searching for a nearby city or using GPS.'}</p>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2"><Beaker className="h-5 w-5" /> {isHindi ? 'उर्वरक सिफारिश' : 'Fertilizer Recommendation'}</CardTitle>
                                <CardDescription>{isHindi ? 'अपने मृदा स्वास्थ्य कार्ड डेटा से एक सटीक एनपीके अनुसूची प्राप्त करें।' : 'Get a precise NPK schedule from your Soil Health Card data.'}</CardDescription>
                            </div>
                             {fertilizerPlan && (
                                <Button variant="outline" size="icon" onClick={() => handleDownload(fertilizerPlan, 'Fertilizer Plan')}>
                                    <Download className="h-4 w-4" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {!showFertilizerForm && !fertilizerPlan && (
                                <Button className="w-full" onClick={() => setShowFertilizerForm(true)}>
                                    {isHindi ? 'उर्वरक योजना प्राप्त करें' : 'Get Fertilizer Plan'}
                                </Button>
                            )}
                            
                            {showFertilizerForm && (
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">{isHindi ? 'अपने मृदा स्वास्थ्य कार्ड से मान दर्ज करें।' : 'Enter values from your Soil Health Card.'}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {shcFields.map(field => (
                                            <div key={field.key} className="space-y-1">
                                                <Label htmlFor={field.key}>{field.label}</Label>
                                                <VoiceInput
                                                    value={String(shcData[field.key] || '')}
                                                    onValueChange={(val) => handleShcChange(field.key, val)}
                                                    fieldName={field.label}
                                                >
                                                    <Input 
                                                        id={field.key} 
                                                        type="number" 
                                                        value={shcData[field.key] || ''} 
                                                        onChange={(e) => handleShcChange(field.key, e.target.value)}
                                                        placeholder={field.placeholder}
                                                    />
                                                </VoiceInput>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button className="w-full" onClick={handleGetFertilizerPlan} disabled={isGettingFertilizerPlan}>
                                            {isGettingFertilizerPlan ? <Loader2 className="animate-spin mr-2"/> : <Atom className="mr-2"/>}
                                            {isHindi ? 'योजना बनाएं' : 'Generate Plan'}
                                        </Button>
                                        <Button variant="outline" onClick={() => setShowFertilizerForm(false)} disabled={isGettingFertilizerPlan}>
                                            {isHindi ? 'रद्द करें' : 'Cancel'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {isGettingFertilizerPlan && (
                                <div className="flex justify-center items-center py-4">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                                </div>
                            )}

                            {fertilizerPlan && (
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-semibold text-lg flex items-center gap-2"><Target/>{isHindi ? 'अनुशंसित एनपीके खुराक (प्रति एकड़)' : 'Recommended NPK Dosage (per Acre)'}</h4>
                                        <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                                            <div className="p-2 rounded bg-muted">
                                                <p className="text-sm font-bold">{isHindi ? 'नाइट्रोजन (एन)' : 'Nitrogen (N)'}</p>
                                                <p>{fertilizerPlan.npkRecommendation.n} kg</p>
                                            </div>
                                            <div className="p-2 rounded bg-muted">
                                                <p className="text-sm font-bold">{isHindi ? 'फास्फोरस (पी)' : 'Phosphorus (P)'}</p>
                                                <p>{fertilizerPlan.npkRecommendation.p} kg</p>
                                            </div>
                                            <div className="p-2 rounded bg-muted">
                                                <p className="text-sm font-bold">{isHindi ? 'पोटेशियम (के)' : 'Potassium (K)'}</p>
                                                <p>{fertilizerPlan.npkRecommendation.k} kg</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-lg flex items-center gap-2"><CalendarIcon/>{isHindi ? 'आवेदन अनुसूची' : 'Application Schedule'}</h4>
                                        <Tabs defaultValue="inorganic" className="w-full mt-2">
                                            <TabsList className="grid w-full grid-cols-2">
                                                <TabsTrigger value="inorganic">{isHindi ? 'अकार्बनिक योजना' : 'Inorganic Plan'}</TabsTrigger>
                                                <TabsTrigger value="organic">{isHindi ? 'जैविक योजना' : 'Organic Plan'}</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="inorganic" className="mt-4">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="text-xs">{isHindi ? 'चरण' : 'Stage'}</TableHead>
                                                            <TableHead className="text-xs">{isHindi ? 'उर्वरक' : 'Fertilizer'}</TableHead>
                                                            <TableHead className="text-xs">{isHindi ? 'मात्रा/एकड़' : 'Quantity/Acre'}</TableHead>
                                                            <TableHead className="text-xs">{isHindi ? 'आवेदन कैसे करें' : 'How to Apply'}</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {fertilizerPlan.fertilizerPlan.inorganic.map((item, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell className="font-medium text-xs">{item.applicationStage}</TableCell>
                                                                <TableCell className="text-xs">{item.fertilizerName}</TableCell>
                                                                <TableCell className="text-xs">{item.quantity}</TableCell>
                                                                <TableCell className="text-xs">{item.applicationMethod}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TabsContent>
                                            <TabsContent value="organic" className="mt-4">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="text-xs">{isHindi ? 'चरण' : 'Stage'}</TableHead>
                                                            <TableHead className="text-xs">{isHindi ? 'उर्वरक' : 'Fertilizer'}</TableHead>
                                                            <TableHead className="text-xs">{isHindi ? 'मात्रा/एकड़' : 'Quantity/Acre'}</TableHead>
                                                            <TableHead className="text-xs">{isHindi ? 'आवेदन कैसे करें' : 'How to Apply'}</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {fertilizerPlan.fertilizerPlan.organic.map((item, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell className="font-medium text-xs">{item.applicationStage}</TableCell>
                                                                <TableCell className="text-xs">{item.fertilizerName}</TableCell>
                                                                <TableCell className="text-xs">{item.quantity}</TableCell>
                                                                <TableCell className="text-xs">{item.applicationMethod}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TabsContent>
                                        </Tabs>
                                    </div>
                                    
                                    <div>
                                        <h4 className="font-semibold text-lg flex items-center gap-2"><ShieldCheck/>{isHindi ? 'अनुशंसित ब्रांड' : 'Recommended Brands'}</h4>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {fertilizerPlan.recommendedBrands.map(brand => <Badge key={brand} variant="secondary">{brand}</Badge>)}
                                        </div>
                                    </div>
                                    
                                     <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertTitle>{isHindi ? 'महत्वपूर्ण नोट्स और सब्सिडी' : 'Important Notes & Subsidies'}</AlertTitle>
                                        <AlertDescription>
                                            <p className="mb-2">{fertilizerPlan.notes}</p>
                                            <p className="font-semibold">{isHindi ? 'सब्सिडी जानकारी:' : 'Subsidy Info:'}</p>
                                            <p>{fertilizerPlan.subsidyInfo}</p>
                                        </AlertDescription>
                                    </Alert>

                                     <Button variant="outline" onClick={() => { setFertilizerPlan(null); setShowFertilizerForm(true); }}>
                                        {isHindi ? 'योजना फिर से बनाएं' : 'Regenerate Plan'}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5"/> {isHindi ? 'लाभ कैलकुलेटर' : 'Profit Calculator'}</CardTitle>
                            <CardDescription>{isHindi ? 'संभावित लाभ का अनुमान लगाएं। मान आपके क्षेत्र के लिए एआई अनुमानों के आधार पर पहले से भरे हुए हैं।' : 'Estimate the potential profit. Values are pre-filled based on AI estimates for your region.'}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Collapsible>
                                <CollapsibleTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between">
                                    <span>{isHindi ? 'इनपुट लागत दर्ज करें' : 'Enter Input Costs'}</span>
                                    <ChevronsUpDown className="h-4 w-4" />
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-4 space-y-4 rounded-md border p-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {Object.keys(costs).map(key => (
                                            <div className="space-y-2" key={key}>
                                                <Label htmlFor={key}>{(key.charAt(0).toUpperCase() + key.slice(1))} Cost (Rs)</Label>
                                                <VoiceInput value={String(costs[key as keyof typeof costs])} onValueChange={(val) => setCosts(c => ({...c, [key]: Number(val) || 0}))} fieldName={`${key} cost`}>
                                                    <Input id={key} type="number" value={costs[key as keyof typeof costs]} onChange={e => setCosts(c => ({...c, [key]: Number(e.target.value) || 0}))} />
                                                </VoiceInput>
                                            </div>
                                        ))}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="yield">{isHindi ? 'अपेक्षित उपज' : 'Expected Yield'} (kg/{farmContext?.sizeUnit})</Label>
                                    <VoiceInput value={String(yieldEstimate)} onValueChange={val => setYieldEstimate(Number(val) || 0)} fieldName="Expected Yield">
                                        <Input id="yield" type="number" value={yieldEstimate} onChange={e => setYieldEstimate(Number(e.target.value) || 0)} />
                                    </VoiceInput>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="price">{isHindi ? 'अपेक्षित बिक्री मूल्य' : 'Expected Selling Price'} (Rs/kg)</Label>
                                    <VoiceInput value={String(sellingPrice)} onValueChange={val => setSellingPrice(Number(val) || 0)} fieldName="Selling Price">
                                    <Input id="price" type="number" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value) || 0)} />
                                    </VoiceInput>
                                </div>
                            </div>

                            <div className="rounded-lg bg-muted p-4 space-y-2">
                                <h4 className="font-semibold text-lg text-center">{isHindi ? 'लाभ सारांश' : 'Profit Summary'}</h4>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">{isHindi ? 'कुल राजस्व:' : 'Total Revenue:'}</span>
                                    <span className="font-bold text-lg">Rs {totalRevenue.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">{isHindi ? 'कुल इनपुट लागत:' : 'Total Input Cost:'}</span>
                                    <span className="font-bold text-lg text-yellow-600">Rs {totalCost.toLocaleString('en-IN')}</span>
                                </div>
                                <hr className="my-2"/>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">{isHindi ? 'शुद्ध लाभ / हानि:' : 'Net Profit / Loss:'}</span>
                                    <span className={`font-bold text-2xl ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        Rs {netProfit.toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSavePlan} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                {isHindi ? 'योजना सहेजें' : 'Save Plan'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    </AppLayout>
  );
}
