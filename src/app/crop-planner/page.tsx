
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/AppLayout';
import type { Farm, CropRecommendationOutput, VarietyRecommendationOutput } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Locate, ChevronsUpDown, Calendar, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getVarietyRecommendations } from '@/ai/flows/variety-recommendation';
import { getAutonomousCropRecommendations } from '@/ai/flows/autonomous-crop-recommendation';
import { VoiceInput } from '@/components/VoiceInput';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { getLocationName } from '@/services/weather';
import Link from 'next/link';

type ManualFarmDetails = {
    location: string;
    size: number;
    sizeUnit: 'acres' | 'hectares';
    soilType: string;
    irrigation: string;
    cropName?: string;
    plantingMonth?: string;
    lastCrop?: string;
};

const soilTypes = [
    "Alluvial Soil", "Black Soil", "Red and Yellow Soil", "Laterite Soil",
    "Arid Soil", "Saline Soil", "Peaty Soil", "Forest Soil",
    "Loamy Soil", "Sandy Soil", "Clay Soil"
];

const irrigationSystems = [
    "Rainfed", "Canal Irrigation", "Drip Irrigation", "Sprinkler Irrigation",
    "Tube Well", "Dug Well", "Tank Irrigation"
];

const soilTypesHi = [
    "जलोढ़ मिट्टी", "काली मिट्टी", "लाल और पीली मिट्टी", "लैटेराइट मिट्टी",
    "शुष्क मिट्टी", "लवणीय मिट्टी", "पीट मिट्टी", "वन मिट्टी",
    "दोमट मिट्टी", "रेतीली मिट्टी", "चिकनी मिट्टी"
];

const irrigationSystemsHi = [
    "वर्षा आधारित", "नहर सिंचाई", "ड्रिप सिंचाई", "छिड़काव सिंचाई",
    "ट्यूबवेल", "खुदा हुआ कुआँ", "टैंक सिंचाई"
];

export default function CropPlannerPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [manualDetails, setManualDetails] = useState<ManualFarmDetails>({
    location: '', size: 5, sizeUnit: 'acres', soilType: '',
    irrigation: '', cropName: '', plantingMonth: '', lastCrop: ''
  });
  const [isLoadingFarms, setIsLoadingFarms] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('saved');

  const { firebaseUser, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const isHindi = user?.language === 'hi';


  useEffect(() => {
    if (user && !manualDetails.location) {
        setManualDetails(prev => ({...prev, location: user.location}));
    }
  }, [user, manualDetails.location]);

  useEffect(() => {
    const fetchFarms = async () => {
      if (!firebaseUser) return;
      setIsLoadingFarms(true);
      try {
        const q = query(collection(db, 'farms'), where("userId", "==", firebaseUser.uid));
        const querySnapshot = await getDocs(q);
        const farmsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Farm));
        setFarms(farmsData);
        if(farmsData.length > 0) {
            handleFarmSelect(farmsData[0].id)
        }
      } catch (error) {
        console.error("Error fetching farms:", error);
        toast({ title: isHindi ? "त्रुटि" : "Error", description: isHindi ? "खेतों को लोड नहीं किया जा सका।" : "Could not fetch farms.", variant: "destructive" });
      } finally {
        setIsLoadingFarms(false);
      }
    };
    fetchFarms();
  }, [firebaseUser, toast, isHindi]);

  const handleFarmSelect = (farmId: string) => {
    const farm = farms.find(f => f.id === farmId);
    if(farm) setSelectedFarm(farm);
  };
  
  const handleManualDetailChange = (field: keyof ManualFarmDetails, value: string | number) => {
    setManualDetails(prev => ({ ...prev, [field]: value }));
  }
  
  const handleIrrigationChange = (system: string, checked: boolean) => {
    setManualDetails(prev => {
        const currentSystems = prev.irrigation ? prev.irrigation.split(', ') : [];
        let newSystems;
        if (checked) {
            newSystems = [...currentSystems, system];
        } else {
            newSystems = currentSystems.filter(s => s !== system);
        }
        return { ...prev, irrigation: newSystems.join(', ') };
    });
  };


  const handleGetRecommendations = async () => {
    let farmData;
    let cropName: string | undefined = undefined;
    
    if (activeTab === 'saved') {
        if (!selectedFarm) {
            toast({ title: isHindi ? "कोई खेत नहीं चुना गया" : "No Farm Selected", description: isHindi ? "कृपया पहले एक खेत चुनें।" : "Please select a farm first.", variant: "destructive" });
            return;
        }
        farmData = selectedFarm;
    } else { // manual
        if (!manualDetails.location || !manualDetails.size || !manualDetails.soilType || !manualDetails.irrigation) {
            toast({ title: isHindi ? "जानकारी अधूरी है" : "Missing Information", description: isHindi ? "कृपया स्थान, आकार, मिट्टी का प्रकार और सिंचाई दर्ज करें।" : "Please enter location, size, soil type, and irrigation.", variant: "destructive" });
            return;
        }
        farmData = manualDetails;
        cropName = manualDetails.cropName;
    }
    
    setIsGenerating(true);
    
    try {
      let result: CropRecommendationOutput | VarietyRecommendationOutput;
      if (cropName) {
          result = await getVarietyRecommendations({ farm: farmData, cropName });
      } else {
          result = await getAutonomousCropRecommendations({ farm: farmData });
      }

      // Store results in localStorage and navigate
      localStorage.setItem('cropRecommendations', JSON.stringify(result.recommendations));
      localStorage.setItem('farmContext', JSON.stringify(farmData));
      router.push('/crop-planner/recommendations');

    } catch (error) {
      console.error("Error getting recommendations:", error);
      toast({ title: isHindi ? "एआई त्रुटि" : "AI Error", description: isHindi ? "सिफारिशें प्राप्त नहीं की जा सकीं।" : "Could not get recommendations.", variant: "destructive" });
      setIsGenerating(false);
    }
    // No need to set isGenerating to false here because we are navigating away.
  };

  const recommendationButtonText = activeTab === 'manual' && manualDetails.cropName ? (isHindi ? 'किस्म की सिफारिशें प्राप्त करें' : 'Get Variety Recommendations') : (isHindi ? 'फसल सिफारिशें प्राप्त करें' : 'Get Crop Recommendations');

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
        toast({ title: isHindi ? "जियोलोकेशन समर्थित नहीं है" : "Geolocation not supported", description: isHindi ? "आपका ब्राउज़र जीपीएस स्थान का समर्थन नहीं करता है।" : "Your browser does not support GPS location.", variant: "destructive" });
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            const locationName = await getLocationName(latitude, longitude);
            if(locationName) {
                handleManualDetailChange('location', locationName);
                toast({ title: isHindi ? "स्थान अपडेट किया गया" : "Location Updated", description: `${isHindi ? "स्थान को" : "Set location to"} ${locationName}` });
            } else {
                 handleManualDetailChange('location', `${latitude}, ${longitude}`);
                 toast({ title: isHindi ? "स्थान प्राप्त हुआ" : "Location Fetched", description: isHindi ? "स्थान का नाम नहीं मिल सका, निर्देशांक का उपयोग कर रहे हैं।" : "Could not get location name, using coordinates." });
            }
        },
        (error) => {
            toast({ title: isHindi ? "स्थान प्राप्त नहीं हो सका" : "Could not get location", description: error.message, variant: "destructive"});
        }
    );
  };
  
  const selectedIrrigationSystems = manualDetails.irrigation ? manualDetails.irrigation.split(', ') : [];

  return (
    <AppLayout title={isHindi ? 'फसल योजनाकार' : 'Crop Planner'}>
      <div className="space-y-6">
        <Card className="bg-primary/10 border-primary">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar /> {isHindi ? 'नया: साल-भर की योजना' : 'New: Year-Long Planning'}</CardTitle>
                <CardDescription>{isHindi ? 'बुद्धिमान, बहु-मौसमी सिफारिशों के साथ पूरे वर्ष अपने फसल चक्र की रणनीतिक योजना बनाएं।' : 'Strategically plan your crop cycle across the entire year with intelligent, multi-season recommendations.'}</CardDescription>
            </CardHeader>
            <CardFooter>
                 <Button asChild>
                    <Link href="/crop-planner/year-long-planning">
                        {isHindi ? 'साल-भर की योजना शुरू करें' : 'Start Year-Long Plan'} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
      
        <Card>
            <CardHeader className="text-center">
                <CardTitle className="text-xl">{isHindi ? 'एकल फसल की सिफारिश' : 'Single Crop Recommendation'}</CardTitle>
                <CardDescription className="text-xs">{isHindi ? 'एकल फसल योजना के लिए सहेजे गए खेत का चयन करें या मैन्युअल रूप से विवरण दर्ज करें।' : 'Choose a saved farm or enter details manually for a single crop plan.'}</CardDescription>
            </CardHeader>
            <CardContent>
               <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="saved">{isHindi ? 'सहेजे गए खेत का उपयोग करें' : 'Use a Saved Farm'}</TabsTrigger>
                    <TabsTrigger value="manual">{isHindi ? 'विवरण मैन्युअल रूप से दर्ज करें' : 'Enter Details Manually'}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="saved" className="mt-4">
                     <Label className="text-sm">{isHindi ? 'अपना खेत चुनें' : 'Select Your Farm'}</Label>
                      {isLoadingFarms ? (
                           <Loader2 className="h-6 w-6 animate-spin text-primary mt-2" />
                      ): farms.length > 0 ? (
                          <Select onValueChange={handleFarmSelect} defaultValue={selectedFarm?.id}>
                              <SelectTrigger>
                                  <SelectValue placeholder={isHindi ? 'एक खेत चुनें' : 'Select a farm'} />
                              </SelectTrigger>
                              <SelectContent>
                                  {farms.map(farm => (
                                      <SelectItem key={farm.id} value={farm.id}>{farm.name} - {farm.location}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      ) : (
                         <p className="text-sm text-muted-foreground mt-2">{isHindi ? 'आपके पास कोई सहेजा हुआ खेत नहीं है। \'मेरे खेत\' पेज पर एक जोड़ें या मैन्युअल रूप से विवरण दर्ज करें।' : 'You have no saved farms. Add one on the \'My Farms\' page or enter details manually.'}</p>
                      )}
                  </TabsContent>
                  <TabsContent value="manual" className="mt-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="cropName" className="text-sm">{isHindi ? 'फसल का नाम (वैकल्पिक)' : 'Crop Name (Optional)'}</Label>
                        <VoiceInput value={manualDetails.cropName || ''} onValueChange={(val) => handleManualDetailChange('cropName', val)} fieldName={isHindi ? 'फसल का नाम' : 'Crop Name'}>
                           <Input id="cropName" value={manualDetails.cropName} onChange={e => handleManualDetailChange('cropName', e.target.value)} placeholder={isHindi ? 'जैसे, चावल, गेहूं। सामान्य सुझावों के लिए खाली छोड़ दें।' : 'e.g., Rice, Wheat. Leave blank for general suggestions.'} />
                        </VoiceInput>
                        <p className="text-xs text-muted-foreground">{isHindi ? 'यदि आप एक फसल दर्ज करते हैं, तो हम उसके लिए विशिष्ट किस्मों की सिफारिश करेंगे।' : 'If you enter a crop, we will recommend specific varieties for it.'}</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="location" className="text-sm">{isHindi ? 'स्थान*' : 'Location*'}</Label>
                            <div className="flex items-center gap-2">
                                <VoiceInput value={manualDetails.location} onValueChange={(val) => handleManualDetailChange('location', val)} fieldName={isHindi ? 'स्थान' : 'Location'}>
                                   <Input id="location" value={manualDetails.location} onChange={e => handleManualDetailChange('location', e.target.value)} placeholder={isHindi ? 'जैसे पुणे, महाराष्ट्र' : 'e.g. Pune, Maharashtra'} />
                                </VoiceInput>
                                <Button type="button" size="icon" variant="outline" onClick={handleUseGPS}>
                                    <Locate className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="size" className="text-sm">{isHindi ? 'भूमि क्षेत्र (एकड़ में)*' : 'Land Area (in acres)*'}</Label>
                            <VoiceInput value={String(manualDetails.size)} onValueChange={(val) => handleManualDetailChange('size', Number(val) || 0)} fieldName={isHindi ? 'भूमि क्षेत्र' : 'Land Area'}>
                               <Input id="size" type="number" value={manualDetails.size} onChange={e => handleManualDetailChange('size', Number(e.target.value) || 0)} placeholder="e.g., 5" />
                            </VoiceInput>
                        </div>
                    </div>
                     <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="plantingMonth" className="text-sm">{isHindi ? 'रोपण का महीना (वैकल्पिक)' : 'Planting Month (Optional)'}</Label>
                            <VoiceInput value={manualDetails.plantingMonth || ''} onValueChange={(val) => handleManualDetailChange('plantingMonth', val)} fieldName={isHindi ? 'रोपण का महीना' : 'Planting Month'}>
                               <Input id="plantingMonth" value={manualDetails.plantingMonth} onChange={e => handleManualDetailChange('plantingMonth', e.target.value)} placeholder={isHindi ? 'जैसे, जून, जुलाई' : 'e.g., June, July'} />
                            </VoiceInput>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastCrop" className="text-sm">{isHindi ? 'पिछली फसल (वैकल्पिक)' : 'Last Crop Grown (Optional)'}</Label>
                            <VoiceInput value={manualDetails.lastCrop || ''} onValueChange={(val) => handleManualDetailChange('lastCrop', val)} fieldName={isHindi ? 'पिछली फसल' : 'Last Crop'}>
                               <Input id="lastCrop" value={manualDetails.lastCrop} onChange={e => handleManualDetailChange('lastCrop', e.target.value)} placeholder={isHindi ? 'जैसे, सोयाबीन, कपास' : 'e.g., Soybean, Cotton'} />
                            </VoiceInput>
                             <p className="text-xs text-muted-foreground">{isHindi ? 'यह मिट्टी को फिर से भरने के लिए बेहतर पोषक तत्वों की सिफारिश करने में मदद करता है।' : 'This helps in recommending better nutrients to replenish the soil.'}</p>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="soilType" className="text-sm">{isHindi ? 'मिट्टी का प्रकार*' : 'Soil Type*'}</Label>
                            <Select onValueChange={(value) => handleManualDetailChange('soilType', value)} value={manualDetails.soilType || ''}>
                                <SelectTrigger>
                                    <SelectValue placeholder={isHindi ? 'मिट्टी का प्रकार चुनें' : 'Select soil type'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {(isHindi ? soilTypesHi : soilTypes).map((type, index) => (
                                        <SelectItem key={type} value={soilTypes[index]}>{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="irrigation" className="text-sm">{isHindi ? 'सिंचाई प्रणाली*' : 'Irrigation System*'}</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between font-normal">
                                        {selectedIrrigationSystems.length > 0 ? selectedIrrigationSystems.map(s => isHindi ? irrigationSystemsHi[irrigationSystems.indexOf(s)] : s).join(', ') : (isHindi ? 'सिंचाई प्रणाली चुनें' : 'Select irrigation system(s)')}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                   <div className="p-4 space-y-2">
                                     {(isHindi ? irrigationSystemsHi : irrigationSystems).map((system, index) => (
                                        <div key={system} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`irrigation-${system}`}
                                                checked={selectedIrrigationSystems.includes(irrigationSystems[index])}
                                                onCheckedChange={(checked) => handleIrrigationChange(irrigationSystems[index], !!checked)}
                                            />
                                            <Label htmlFor={`irrigation-${system}`} className="font-normal">{system}</Label>
                                        </div>
                                    ))}
                                   </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                  </TabsContent>
                </Tabs>
            </CardContent>
             <CardFooter>
                <Button onClick={handleGetRecommendations} disabled={isGenerating || (activeTab === 'saved' && !selectedFarm)}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                    {recommendationButtonText}
                </Button>
            </CardFooter>
        </Card>

        {isGenerating && (
            <div className="fixed inset-0 bg-background/80 flex flex-col justify-center items-center z-50">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-lg text-muted-foreground">{isHindi ? 'हमारा एआई आपके खेत के डेटा का विश्लेषण कर रहा है...' : 'Our AI is analyzing your farm data...'}</p>
                <p className="text-sm text-muted-foreground">{isHindi ? 'इसमें कुछ समय लग सकता है।' : 'This may take a moment.'}</p>
            </div>
        )}
      </div>
    </AppLayout>
  );
}
