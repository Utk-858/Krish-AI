
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/AppLayout';
import type { Farm } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Stethoscope, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { diagnosePlantDisease } from '@/ai/flows/diagnose-plant-disease';
import { VoiceInput } from '@/components/VoiceInput';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

type ManualFarmDetails = Partial<Farm>;

export default function DiseaseDiagnosisPage() {
    const [farms, setFarms] = useState<Farm[]>([]);
    const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
    const [manualDetails, setManualDetails] = useState<ManualFarmDetails>({});
    const [isLoadingFarms, setIsLoadingFarms] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [symptoms, setSymptoms] = useState('');
    const [isDiagnosing, setIsDiagnosing] = useState(false);
    const [activeTab, setActiveTab] = useState('saved');

    const { firebaseUser, user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isHindi = user?.language === 'hi';

    useEffect(() => {
        if (user && !manualDetails.location) {
            setManualDetails(prev => ({ ...prev, location: user.location, userId: user.name }));
        }
    }, [user, manualDetails.location]);

    useEffect(() => {
        const fetchFarms = async () => {
            if (!firebaseUser) return;
            setIsLoadingFarms(true);
            try {
                const farmsCollectionRef = collection(db, 'farms');
                const q = query(farmsCollectionRef, where("userId", "==", firebaseUser.uid));
                const querySnapshot = await getDocs(q);
                const farmsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Farm));
                setFarms(farmsData);
                if (farmsData.length > 0) {
                    handleFarmSelect(farmsData[0].id);
                } else {
                    setActiveTab('manual');
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
        if (farm) {
            setSelectedFarm(farm);
        }
    };
    
    const handleManualDetailChange = (field: keyof ManualFarmDetails, value: string | number) => {
        setManualDetails(prev => ({ ...prev, [field]: value }));
    }

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDiagnose = async () => {
        let farmData: Partial<Farm> | null = null;
        
        if (activeTab === 'saved') {
            farmData = selectedFarm;
        } else {
            farmData = manualDetails;
        }
        
        if (!farmData || !farmData.mainCrop) {
            toast({ title: isHindi ? 'खेत या फसल निर्दिष्ट नहीं है' : 'Farm or crop not specified', description: isHindi ? 'कृपया एक खेत चुनें या फसल का विवरण दर्ज करें।' : 'Please select a farm or enter crop details.', variant: 'destructive' });
            return;
        }
        if (!imageFile && !symptoms) {
            toast({ title: isHindi ? 'जानकारी अधूरी है' : 'Missing Information', description: isHindi ? 'कृपया एक छवि अपलोड करें या लक्षण बताएं' : 'Please upload an image or describe symptoms', variant: 'destructive' });
            return;
        }
        if (!user) {
             toast({ title: isHindi ? 'उपयोगकर्ता नहीं मिला' : 'User not found', description: isHindi ? 'कृपया पुनः लॉग इन करें।' : 'Please log in again.', variant: 'destructive' });
            return;
        }

        setIsDiagnosing(true);

        try {
            const result = await diagnosePlantDisease({
                farm: farmData,
                symptoms: symptoms,
                photoDataUri: imagePreview || undefined,
                language: user.language,
            });

            localStorage.setItem('diagnosisResults', JSON.stringify(result.diagnosis));
            localStorage.setItem('diagnosisFarmContext', JSON.stringify(farmData));
            localStorage.setItem('diagnosisImage', imagePreview || '');
            localStorage.setItem('diagnosisSymptoms', symptoms);
            
            router.push('/disease-diagnosis/results');

        } catch (error) {
            console.error("Error diagnosing disease:", error);
            toast({ title: isHindi ? "एआई त्रुटि" : "AI Error", description: isHindi ? "निदान नहीं किया जा सका।" : "Could not perform diagnosis.", variant: "destructive" });
            setIsDiagnosing(false);
        }
    };

    return (
        <AppLayout title={isHindi ? 'रोग निदान' : 'Disease Diagnosis'}>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{isHindi ? 'जानकारी प्रदान करें' : 'Provide Information'}</CardTitle>
                        <CardDescription>{isHindi ? 'एक खेत का चयन करें या मैन्युअल रूप से विवरण दर्ज करें, फिर एक छवि या लक्षण प्रदान करें।' : 'Select a farm or enter details manually, then provide an image or symptoms.'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                              <SelectItem key={farm.id} value={farm.id}>{farm.name} - {farm.mainCrop}</SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                              ) : (
                                 <p className="text-sm text-muted-foreground mt-2">{isHindi ? 'आपके पास कोई सहेजा हुआ खेत नहीं है। कृपया मैन्युअल रूप से विवरण दर्ज करें।' : 'You have no saved farms. Please enter details manually.'}</p>
                              )}
                              {selectedFarm && <p className="text-sm text-muted-foreground mt-2">{isHindi ? 'के लिए निदान:' : 'Diagnosing for:'} <span className="font-semibold text-foreground">{selectedFarm.mainCrop}</span></p>}
                          </TabsContent>
                           <TabsContent value="manual" className="mt-4 space-y-4">
                             <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mainCrop" className="text-sm">{isHindi ? 'फसल का नाम*' : 'Crop Name*'}</Label>
                                     <VoiceInput value={manualDetails.mainCrop || ''} onValueChange={(val) => handleManualDetailChange('mainCrop', val)} fieldName={isHindi ? 'फसल का नाम' : "Crop Name"}>
                                       <Input id="mainCrop" value={manualDetails.mainCrop} onChange={e => handleManualDetailChange('mainCrop', e.target.value)} placeholder={isHindi ? 'जैसे टमाटर' : "e.g. Tomato"} />
                                    </VoiceInput>
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="location" className="text-sm">{isHindi ? 'स्थान*' : 'Location*'}</Label>
                                     <VoiceInput value={manualDetails.location || ''} onValueChange={(val) => handleManualDetailChange('location', val)} fieldName={isHindi ? 'स्थान' : 'Location'}>
                                       <Input id="location" value={manualDetails.location} onChange={e => handleManualDetailChange('location', e.target.value)} placeholder={isHindi ? 'जैसे पुणे, महाराष्ट्र' : 'e.g. Pune, Maharashtra'} />
                                    </VoiceInput>
                                </div>
                             </div>
                          </TabsContent>
                        </Tabs>
                        
                        <Tabs defaultValue="image" className="w-full pt-4">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="image">{isHindi ? 'छवि अपलोड करें' : 'Image Upload'}</TabsTrigger>
                                <TabsTrigger value="symptoms">{isHindi ? 'लक्षणों का वर्णन करें' : 'Describe Symptoms'}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="image" className="mt-4">
                                <div className="flex flex-col items-center space-y-4 rounded-lg border-2 border-dashed p-6 text-center">
                                    {imagePreview ? (
                                        <Image src={imagePreview} alt={isHindi ? 'पौधे का पूर्वावलोकन' : "Plant preview"} width={192} height={192} className="max-h-48 w-auto rounded-md object-contain" />
                                    ) : (
                                        <Upload className="h-12 w-12 text-muted-foreground" />
                                    )}
                                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        {imagePreview ? (isHindi ? 'छवि बदलें' : 'Change Image') : (isHindi ? 'एक छवि अपलोड करें' : 'Upload an Image')}
                                    </Button>
                                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                                    <p className="text-xs text-muted-foreground">{isHindi ? 'प्रभावित पौधे के हिस्से की एक स्पष्ट तस्वीर अपलोड करें।' : 'Upload a clear photo of the affected plant part.'}</p>
                                </div>
                            </TabsContent>
                            <TabsContent value="symptoms" className="mt-4">
                                <Label htmlFor="symptoms" className="text-sm">{isHindi ? 'दिख रहे लक्षणों का वर्णन करें' : 'Describe the symptoms you are seeing'}</Label>
                                 <VoiceInput value={symptoms} onValueChange={setSymptoms} fieldName={isHindi ? 'लक्षण' : 'Symptoms'}>
                                    <Textarea id="symptoms" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder={isHindi ? 'जैसे, भूरे धब्बों के साथ पीली पत्तियां, पत्तियों पर सफेद पाउडर की परत...' : "e.g., Yellowing leaves with brown spots, white powdery coating on leaves..."} rows={4} />
                                </VoiceInput>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleDiagnose} disabled={isDiagnosing || (activeTab === 'saved' && !selectedFarm) || (activeTab === 'manual' && !manualDetails.mainCrop)}>
                            {isDiagnosing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Stethoscope className="mr-2 h-4 w-4" />}
                            {isHindi ? 'समस्या का निदान करें' : 'Diagnose Problem'}
                        </Button>
                    </CardFooter>
                </Card>

                {isDiagnosing && (
                    <div className="fixed inset-0 bg-background/80 flex flex-col justify-center items-center z-50">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="mt-4 text-lg text-muted-foreground">{isHindi ? 'हमारा एआई आपके फसल डेटा का विश्लेषण कर रहा है...' : 'Our AI is analyzing your crop data...'}</p>
                        <p className="text-sm text-muted-foreground">{isHindi ? 'इसमें कुछ समय लग सकता है।' : 'This may take a moment.'}</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
