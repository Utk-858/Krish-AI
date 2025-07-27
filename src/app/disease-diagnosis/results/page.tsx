
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/AppLayout';
import { Loader2, CheckCircle, ArrowLeft, Microscope } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import type { DiagnosisOutput } from '@/ai/flows/diagnose-plant-disease';
import { useAuth } from '@/hooks/useAuth';

type Diagnosis = DiagnosisOutput['diagnosis'][0];

export default function DiagnosisResultsPage() {
    const [diagnosisResults, setDiagnosisResults] = useState<Diagnosis[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { toast } = useToast();
    const router = useRouter();
    const { user } = useAuth();
    const isHindi = user?.language === 'hi';

    useEffect(() => {
        try {
            const storedResults = localStorage.getItem('diagnosisResults');
            const storedFarm = localStorage.getItem('diagnosisFarmContext');

            if (storedResults && storedFarm) {
                setDiagnosisResults(JSON.parse(storedResults));
            } else {
                toast({ title: isHindi ? "कोई निदान डेटा नहीं मिला" : "No diagnosis data found", description: isHindi ? "कृपया वापस जाएं और पहले एक निदान अनुरोध सबमिट करें।" : "Please go back and submit a diagnosis request first.", variant: "destructive" });
                router.push('/disease-diagnosis');
            }
        } catch (error) {
            console.error("Failed to parse data from localStorage", error);
            toast({ title: isHindi ? "त्रुटि" : "Error", description: isHindi ? "निदान परिणाम लोड नहीं किए जा सके।" : "Could not load diagnosis results.", variant: "destructive" });
            router.push('/disease-diagnosis');
        } finally {
            setIsLoading(false);
        }
    }, [router, toast, isHindi]);


    const handleSelectDisease = (disease: Diagnosis) => {
        try {
            localStorage.setItem('selectedDiseasePlan', JSON.stringify(disease));
            router.push('/disease-diagnosis/results/plan');
        } catch (error) {
            console.error("Failed to save selected plan to localStorage", error);
            toast({ title: isHindi ? "त्रुटि" : "Error", description: isHindi ? "इस योजना का चयन नहीं किया जा सका। कृपया पुनः प्रयास करें।" : "Could not select this plan. Please try again.", variant: "destructive" });
        }
    };
    
    if (isLoading) {
        return <AppLayout title={isHindi ? "लोड हो रहा है..." : "Loading..."}><div className="text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/></div></AppLayout>;
    }

    return (
        <AppLayout title={isHindi ? 'निदान परिणाम' : 'Diagnosis Results'}>
            <div className="space-y-6">
                <Button variant="outline" onClick={() => router.push('/disease-diagnosis')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> {isHindi ? 'निदान पर वापस जाएं' : 'Back to Diagnosis'}
                </Button>
                
                <Card>
                    <CardHeader>
                        <CardTitle>{isHindi ? 'निदान परिणाम' : 'Diagnosis Results'}</CardTitle>
                        <CardDescription>{isHindi ? 'हमारे एआई ने जानकारी का विश्लेषण किया है। उपचार योजना देखने के लिए कृपया सबसे संभावित निदान का चयन करें।' : 'Our AI has analyzed the information. Please select the most likely diagnosis to see a treatment plan.'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {diagnosisResults.length > 0 ? (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {diagnosisResults.map((result, index) => (
                                    <Card key={index} className="flex flex-col">
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between">
                                                {result.diseaseName}
                                                <Badge variant={result.confidence > 80 ? 'default' : 'secondary'}>{result.confidence}% {isHindi ? 'मिलान' : 'Match'}</Badge>
                                            </CardTitle>
                                            <CardDescription>{result.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <h4 className="font-semibold mb-2">{isHindi ? 'लक्षण जांचसूची:' : 'Symptoms Checklist:'}</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                                {result.symptoms.map((symptom, i) => <li key={i}>{symptom}</li>)}
                                            </ul>
                                        </CardContent>
                                        <CardFooter>
                                            <Button variant="outline" className="w-full" onClick={() => handleSelectDisease(result)}>
                                                <CheckCircle className="mr-2 h-4 w-4" /> {isHindi ? 'यह सही लग रहा है' : 'This Looks Right'}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <Microscope className="h-12 w-12 mx-auto text-muted-foreground"/>
                                <p className="mt-4">{isHindi ? 'एआई दी गई जानकारी से निदान का निर्धारण नहीं कर सका।' : 'The AI could not determine a diagnosis from the provided information.'}</p>
                                <p className="text-sm text-muted-foreground">{isHindi ? 'कृपया एक स्पष्ट छवि या अधिक विस्तृत लक्षणों के साथ फिर से प्रयास करें।' : 'Please try again with a clearer image or more detailed symptoms.'}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
