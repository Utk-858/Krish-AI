'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Bot, Locate } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { Farm } from '@/lib/types';
import { VoiceInput } from '@/components/VoiceInput';
import { getSellAdvice } from '@/ai/flows/market-advisor';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRouter } from 'next/navigation';
import { getLocationName } from '@/services/weather';

type ManualEntryData = {
    cropName: string;
    quantity: number;
    unit: 'quintal' | 'kg';
    isHarvested: boolean;
    location: string;
    storageDays: number;
};

export default function MarketInsightsPage() {
    const [farms, setFarms] = useState<Farm[]>([]);
    const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
    const [isLoadingFarms, setIsLoadingFarms] = useState(true);
    const [activeTab, setActiveTab] = useState('saved');
    const [manualData, setManualData] = useState<ManualEntryData>({
        cropName: '',
        quantity: 10,
        unit: 'quintal',
        isHarvested: true,
        location: '',
        storageDays: 15,
    });

    const { user, firebaseUser } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const isHindi = user?.language === 'hi';
    const [isThinking, setIsThinking] = useState(false);

    useEffect(() => {
        if (user && !manualData.location) {
            setManualData(prev => ({ ...prev, location: user.location }));
        }
    }, [user, manualData.location]);

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
                    setSelectedFarm(farmsData[0]);
                } else {
                    setActiveTab('manual');
                }
            } catch (error) {
                console.error("Error fetching farms:", error);
                toast({
                    title: isHindi ? "त्रुटि" : "Error",
                    description: isHindi ? "खेतों को लोड नहीं किया जा सका।" : "Could not fetch farms.",
                    variant: "destructive"
                });
            } finally {
                setIsLoadingFarms(false);
            }
        };
        if (firebaseUser) {
            fetchFarms();
        }
    }, [firebaseUser, toast, isHindi]);

    const handleFarmSelect = (farmId: string) => {
        const farm = farms.find(f => f.id === farmId);
        if (farm) {
            setSelectedFarm(farm);
        }
    };

    const triggerAnalysis = async () => {
        let analysisParams: {
            crop: string;
            quantity: number;
            unit: 'quintal' | 'kg';
            isHarvested: boolean;
            storageDays: number;
            location: string;
        };

        if (activeTab === 'saved') {
            if (!selectedFarm) {
                toast({
                    title: isHindi ? "कोई खेत नहीं चुना गया" : "No Farm Selected",
                    description: isHindi ? "कृपया पहले एक खेत चुनें।" : "Please select a farm first.",
                    variant: "destructive"
                });
                return;
            }
            analysisParams = {
                crop: selectedFarm.mainCrop,
                quantity: 10,
                unit: 'quintal',
                isHarvested: true,
                storageDays: 15,
                location: selectedFarm.location,
            };
        } else {
            if (!manualData.cropName || !manualData.location) {
                toast({
                    title: isHindi ? "जानकारी अधूरी है" : "Missing Info",
                    description: isHindi ? "कृपया फसल का नाम और स्थान प्रदान करें।" : "Please provide a crop name and location.",
                    variant: "destructive"
                });
                return;
            }
            analysisParams = {
                crop: manualData.cropName,
                quantity: manualData.quantity,
                unit: manualData.unit,
                isHarvested: manualData.isHarvested,
                storageDays: manualData.storageDays,
                location: manualData.location,
            };
        }

        if (!user) {
            toast({
                title: isHindi ? "लॉग इन नहीं किया है" : "Not logged in",
                description: isHindi ? "विश्लेषण प्राप्त करने के लिए आपको लॉग इन होना चाहिए।" : "You need to be logged in to get analysis.",
                variant: "destructive"
            });
            return;
        }

        setIsThinking(true);

        try {
            const result = await getSellAdvice({
                profile: user,
                crop: analysisParams.crop,
                quantity: analysisParams.quantity,
                storageDaysLeft: analysisParams.storageDays,
                harvestStatus: analysisParams.isHarvested ? 'Harvested' : 'Not Harvested',
                unit: analysisParams.unit as 'quintal' | 'kg', // ✅ FIXED TYPE ERROR HERE
            });

            localStorage.setItem('marketAnalysisResult', JSON.stringify(result));
            localStorage.setItem('marketAnalysisContext', JSON.stringify(analysisParams));
            router.push('/market-insights/results');
        } catch (e) {
            console.error("AI Error:", e);
            toast({
                title: isHindi ? "एआई त्रुटि" : "AI Error",
                description: isHindi ? "सलाह नहीं मिल सकी।" : "Could not get advice.",
                variant: "destructive"
            });
            setIsThinking(false);
        }
    };

    const handleManualDataChange = (field: keyof ManualEntryData, value: string | number | boolean) => {
        setManualData(prev => ({ ...prev, [field]: value }));
    };

    const handleUseGPS = () => {
        if (!navigator.geolocation) {
            toast({
                title: isHindi ? "जियोलोकेशन समर्थित नहीं है" : "Geolocation not supported",
                variant: "destructive"
            });
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const locationName = await getLocationName(pos.coords.latitude, pos.coords.longitude);
                if (locationName) {
                    handleManualDataChange('location', locationName);
                    toast({
                        title: isHindi ? 'स्थान अपडेट किया गया' : 'Location Updated',
                        description: `${isHindi ? 'स्थान' : 'Location set to'} ${locationName}`
                    });
                } else {
                    toast({
                        title: isHindi ? 'स्थान का नाम नहीं मिला' : 'Could not get location name',
                        variant: 'destructive'
                    });
                }
            },
            (err) => toast({
                title: isHindi ? "स्थान प्राप्त नहीं हो सका" : "Could not get location",
                description: err.message,
                variant: "destructive"
            })
        );
    };
    return (
        <AppLayout title={isHindi ? 'बाजार जानकारी' : 'Market Insights'}>
            <div className="max-w-2xl mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{isHindi ? 'रीयल-टाइम बाजार विश्लेषण' : 'Real-Time Market Analysis'}</CardTitle>
                        <CardDescription>{isHindi ? 'अपना मुनाफा अधिकतम करने के लिए लाइव बाजार जानकारी प्राप्त करें।' : 'Get live market insights to maximize your profit.'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Tabs and form logic as is */}
                        {/* ...your form and UI content remains unchanged */}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={triggerAnalysis} disabled={isThinking}>
                            {isThinking ? <Loader2 className="animate-spin mr-2" /> : <Bot className="mr-2" />}
                            {isHindi ? 'विश्लेषण प्राप्त करें' : 'Get Analysis'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </AppLayout>
    );
}