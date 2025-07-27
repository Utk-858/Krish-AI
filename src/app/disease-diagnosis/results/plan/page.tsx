
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/AppLayout';
import type { Farm } from '@/lib/types';
import { Loader2, ArrowLeft, Pill, Phone, MapPin, AlertTriangle, Info, ListChecks, Calendar, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { DiagnosisOutput } from '@/ai/flows/diagnose-plant-disease';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';

type Diagnosis = DiagnosisOutput['diagnosis'][0];

export default function DiagnosisPlanPage() {
    const [selectedDisease, setSelectedDisease] = useState<Diagnosis | null>(null);
    const [farmContext, setFarmContext] = useState<Partial<Farm> | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { toast } = useToast();
    const router = useRouter();
    const { user } = useAuth();
    const isHindi = user?.language === 'hi';

    useEffect(() => {
        try {
            const storedPlan = localStorage.getItem('selectedDiseasePlan');
            const storedFarm = localStorage.getItem('diagnosisFarmContext');
            const storedImage = localStorage.getItem('diagnosisImage');

            if (storedPlan && storedFarm) {
                setSelectedDisease(JSON.parse(storedPlan));
                setFarmContext(JSON.parse(storedFarm));
                setImagePreview(storedImage);
            } else {
                toast({ title: isHindi ? "कोई योजना डेटा नहीं मिला" : "No plan data found", description: isHindi ? "कृपया वापस जाएं और पहले एक निदान चुनें।" : "Please go back and select a diagnosis first.", variant: "destructive" });
                router.push('/disease-diagnosis/results');
            }
        } catch (error) {
            console.error("Failed to parse data from localStorage", error);
            toast({ title: isHindi ? "त्रुटि" : "Error", description: isHindi ? "निदान योजना लोड नहीं की जा सकी।" : "Could not load diagnosis plan.", variant: "destructive" });
            router.push('/disease-diagnosis/results');
        } finally {
            setIsLoading(false);
        }
    }, [router, toast, isHindi]);
    
    const generateCalendarLink = (title: string, weekText: string) => {
        const getNextDateForWeek = (weekNumber: number) => {
            const now = new Date();
            const daysUntilNextMonday = (1 - now.getDay() + 7) % 7;
            const nextMonday = new Date(now.setDate(now.getDate() + daysUntilNextMonday));
            nextMonday.setDate(nextMonday.getDate() + (weekNumber - 1) * 7);
            return nextMonday;
        };
        
        const weekMatch = weekText.match(/\d+/);
        const weekNumber = weekMatch ? parseInt(weekMatch[0], 10) : 1;
        
        const startDate = getNextDateForWeek(weekNumber);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1);

        const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, '').slice(0, 15) + 'Z';
        
        const yyyymmdd = (d:Date) => d.toISOString().slice(0,10).replace(/-/g,'');

        const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
        const params = new URLSearchParams({
            text: `${isHindi ? 'कृष-एआई उपचार:' : 'KrishAI Treatment:'} ${title}`,
            dates: `${yyyymmdd(startDate)}/${yyyymmdd(endDate)}`,
            details: `${isHindi ? `${farmContext?.location} पर आपके खेत पर ${selectedDisease?.diseaseName} के लिए निर्धारित कृषि गतिविधि। कृपया कृष-एआई ऐप में दिए गए आवेदन निर्देशों का पालन करें।` : `Scheduled agricultural activity for ${selectedDisease?.diseaseName} on your farm at ${farmContext?.location}. Please follow the application instructions provided in the KrishAI app.`}`,
            ctz: 'Asia/Kolkata',
        });
        return `${baseUrl}&${params.toString()}`;
    };
    
    const createGoogleMapsLink = (address: string) => {
        const baseUrl = 'https://www.google.com/maps/search/?api=1';
        const params = new URLSearchParams({
            query: address
        });
        return `${baseUrl}&${params.toString()}`;
    };

    if (isLoading || !selectedDisease) {
        return <AppLayout title={isHindi ? "लोड हो रहा है..." : "Loading..."}><div className="text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/></div></AppLayout>;
    }

    return (
        <AppLayout title={`${isHindi ? 'के लिए उपचार' : 'Treatment for'} ${selectedDisease.diseaseName}`}>
             <div className="space-y-6">
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> {isHindi ? 'निदान परिणामों पर वापस जाएं' : 'Back to Diagnosis Results'}
                </Button>
                
                <div className="grid lg:grid-cols-3 gap-6 items-start">
                    {/* Left Column */}
                    <Card className="lg:col-span-1 space-y-6">
                        <CardHeader>
                            <CardTitle>{isHindi ? 'प्रस्तुत पौधे की तस्वीर' : 'Submitted plant photo'}</CardTitle>
                        </CardHeader>
                        {imagePreview && (
                            <CardContent className="p-0">
                                 <Image src={imagePreview} alt={isHindi ? "प्रस्तुत पौधे की तस्वीर" : "Submitted plant photo"} width={600} height={400} className="object-cover w-full h-auto" data-ai-hint="diseased plant"/>
                            </CardContent>
                        )}
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-lg flex items-center gap-2">{isHindi ? 'निदान:' : 'Diagnosis:'} {selectedDisease.diseaseName}</h3>
                                <p className="text-sm text-muted-foreground">{selectedDisease.description}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold flex items-center gap-2">{isHindi ? 'मुख्य लक्षण' : 'Key Symptoms'}</h4>
                                 <ul className="list-disc pl-6 mt-1 space-y-1 text-sm text-muted-foreground">
                                    {selectedDisease.symptoms.map((symptom, i) => <li key={i}>{symptom}</li>)}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right Column */}
                    <div className="lg:col-span-2 space-y-6">
                         <Card>
                            <CardHeader>
                                <CardTitle>{isHindi ? 'उपचार योजना' : 'Treatment Plan'}</CardTitle>
                                <CardDescription>{isHindi ? `समस्या का इलाज करने और अपनी फसलों की रक्षा के लिए इन सिफारिशों का पालन करें। इलाज और सुझाव आपके क्षेत्र (${farmContext?.location}) के लिए तैयार किए गए हैं।` : `Follow these recommendations to treat the issue and protect your crops. Cures and suggestions are tailored for your region (${farmContext?.location}).`}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="inorganic" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="inorganic">{isHindi ? 'अकार्बनिक इलाज' : 'Inorganic Cure'}</TabsTrigger>
                                        <TabsTrigger value="organic">{isHindi ? 'जैविक इलाज' : 'Organic Cure'}</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="inorganic" className="mt-4 space-y-4">
                                        {selectedDisease.treatment.inorganic.map((treat, i) => (
                                            <div key={`inorganic-${i}`} className="p-4 border rounded-lg">
                                                <h4 className="font-semibold text-lg">{treat.solutionName}</h4>
                                                <p className="text-sm mt-1"><span className="font-semibold">{isHindi ? 'आवेदन:' : 'Application:'}</span> {treat.applicationMethod}</p>
                                                <p className="text-xs text-destructive mt-1"><span className="font-semibold">{isHindi ? 'चेतावनी:' : 'Warning:'}</span> {treat.safetyWarning}</p>
                                            </div>
                                        ))}
                                    </TabsContent>
                                     <TabsContent value="organic" className="mt-4 space-y-4">
                                        {selectedDisease.treatment.organic.map((treat, i) => (
                                            <div key={`organic-${i}`} className="p-4 border rounded-lg">
                                                <h4 className="font-semibold text-lg">{treat.solutionName}</h4>
                                                <p className="text-sm mt-1"><span className="font-semibold">{isHindi ? 'आवेदन:' : 'Application:'}</span> {treat.applicationMethod}</p>
                                                <p className="text-xs text-destructive mt-1"><span className="font-semibold">{isHindi ? 'चेतावनी:' : 'Warning:'}</span> {treat.safetyWarning}</p>
                                            </div>
                                        ))}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Calendar/> {isHindi ? 'उपचार अनुसूची' : 'Treatment Schedule'}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{isHindi ? 'सप्ताह' : 'Week'}</TableHead>
                                            <TableHead>{isHindi ? 'गतिविधि' : 'Activity'}</TableHead>
                                            <TableHead className="text-right">{isHindi ? 'कार्रवाई' : 'Action'}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedDisease.treatment.schedule.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{item.week}</TableCell>
                                                <TableCell>{item.activity}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <a href={generateCalendarLink(item.activity, item.week)} target="_blank" rel="noopener noreferrer">
                                                           {isHindi ? 'कैलेंडर में जोड़ें' : 'Add to Calendar'} <ExternalLink className="ml-2 h-3 w-3"/>
                                                        </a>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>{isHindi ? 'आस-पास की कृषि-दुकानें' : 'Nearby Agri-Shops'}</CardTitle>
                                <CardDescription>{isHindi ? 'अनुशंसित इलाजों के लिए अपने आस-पास आपूर्ति खोजें।' : 'Find supplies for the recommended cures near you.'}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {selectedDisease.vendorRecommendations.length > 0 ? (
                                    selectedDisease.vendorRecommendations.map((vendor, i) => (
                                         <a key={i} href={createGoogleMapsLink(vendor.address)} target="_blank" rel="noopener noreferrer" className="block rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                                             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                <div>
                                                    <p className="font-semibold text-base flex items-center gap-2"><Pill /> {vendor.name}</p>
                                                    <p className="text-sm text-muted-foreground flex items-start gap-2 mt-1"><MapPin className="h-4 w-4 mt-0.5 flex-shrink-0"/> {vendor.address}</p>
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    {vendor.phone && (
                                                        <Button variant="outline" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                                                            <a href={`tel:${vendor.phone}`} className="flex items-center justify-center gap-2">
                                                                <Phone className="h-4 w-4" />
                                                                {vendor.phone}
                                                            </a>
                                                        </Button>
                                                    )}
                                                    <Button variant="secondary" size="sm" className="flex items-center justify-center gap-2">
                                                        {isHindi ? 'नेविगेट करें' : 'Navigate'} <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                         </a>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">{isHindi ? 'आपके स्थान के लिए कोई आस-पास की दुकानें नहीं मिलीं।' : 'No nearby shops were found for your location.'}</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
