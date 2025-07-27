
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, Bell, Newspaper, Lightbulb, Bot, MapPin, Wind, Sun, ArrowLeft, Droplets, Briefcase, Cloudy, Umbrella } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import type { MarketAlert, SellAdvice } from '@/lib/types';
import { VoiceInput } from '@/components/VoiceInput';
import { PriceChart } from '@/components/PriceChart';
import { Badge } from '@/components/ui/badge';
import { checkPriceAlerts } from '@/ai/flows/check-price-alerts';

type MarketContext = {
    crop: string;
    location: string;
    quantity: number;
    unit: 'kg' | 'quintal';
}

export default function MarketResultsPage() {
    const [advice, setAdvice] = useState<SellAdvice | null>(null);
    const [context, setContext] = useState<MarketContext | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { firebaseUser, user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const isHindi = user?.language === 'hi';

    // Alerts State
    const [alertCrop, setAlertCrop] = useState('');
    const [alertPrice, setAlertPrice] = useState(0);
    const [isSavingAlert, setIsSavingAlert] = useState(false);
    
    const handleCheckAlerts = useCallback(async () => {
        if (!firebaseUser || !user || !firebaseUser.phoneNumber) return;
        try {
            const alertsQuery = query(
                collection(db, 'marketAlerts'),
                where('userId', '==', firebaseUser.uid),
                where('status', '==', 'active')
            );
            const querySnapshot = await getDocs(alertsQuery);
            const activeAlerts = querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as MarketAlert);
            
            if (activeAlerts.length > 0) {
                const result = await checkPriceAlerts({ alerts: activeAlerts, profile: user, phone: firebaseUser.phoneNumber });
                if (result.triggeredAlerts.length > 0) {
                    toast({
                        title: isHindi ? `${result.triggeredAlerts.length} मूल्य अलर्ट ट्रिगर हुए!` : `${result.triggeredAlerts.length} Price Alert(s) Triggered!`,
                        description: isHindi ? 'विवरण के लिए सूचना पृष्ठ देखें।' : 'Check the notifications page for details.',
                    });
                }
            }
        } catch (error) {
            console.error('Error checking price alerts:', error);
        }
    }, [firebaseUser, user, toast, isHindi]);

    useEffect(() => {
        try {
            const storedAdvice = localStorage.getItem('marketAnalysisResult');
            const storedContext = localStorage.getItem('marketAnalysisContext');

            if (storedAdvice && storedContext) {
                const parsedAdvice = JSON.parse(storedAdvice);
                const parsedContext = JSON.parse(storedContext);
                setAdvice(parsedAdvice);
                setContext(parsedContext);
                setAlertCrop(parsedContext.crop);
            } else {
                toast({ title: isHindi ? "कोई विश्लेषण डेटा नहीं" : "No analysis data", description: isHindi ? "कृपया वापस जाएं और पहले एक विश्लेषण उत्पन्न करें।" : "Please go back and generate an analysis first.", variant: "destructive" });
                router.push('/market-insights');
            }
        } catch (error) {
            console.error("Failed to parse market analysis data from localStorage", error);
            toast({ title: isHindi ? "त्रुटि" : "Error", description: isHindi ? "विश्लेषण परिणाम लोड नहीं किए जा सके।" : "Could not load analysis results.", variant: "destructive" });
            router.push('/market-insights');
        } finally {
            setIsLoading(false);
        }
    }, [router, toast, isHindi]);
    
     useEffect(() => {
        if (firebaseUser) {
            handleCheckAlerts();
        }
    }, [firebaseUser, handleCheckAlerts]);


    const handleSaveAlert = async () => {
        if(!firebaseUser || !alertCrop || !alertPrice) {
            toast({ title: isHindi ? "जानकारी अधूरी है" : "Missing Info", description: isHindi ? "कृपया एक फसल चुनें और मूल्य दर्ज करें।" : "Please select a crop and enter a price.", variant: "destructive"});
            return;
        };
        setIsSavingAlert(true);
        try {
            const newAlert: Omit<MarketAlert, 'id'> = {
                userId: firebaseUser.uid,
                crop: alertCrop,
                priceThreshold: alertPrice,
                status: 'active',
                createdAt: new Date().toISOString(),
            }
            await addDoc(collection(db, 'marketAlerts'), newAlert);
            toast({ title: isHindi ? "सफलता" : "Success", description: `${isHindi ? `${alertCrop} के लिए अलर्ट ₹${alertPrice} से ऊपर सेट किया गया।` : `Alert set for ${alertCrop} above Rs ${alertPrice}.`}`});
            setAlertPrice(0);
        } catch(e) {
            toast({ title: isHindi ? "त्रुटि" : "Error", description: isHindi ? "अलर्ट सहेजा नहीं जा सका।" : "Could not save alert.", variant: "destructive"});
        } finally {
            setIsSavingAlert(false);
        }
    }
    
    const getWeatherIcon = (condition: string) => {
        const lowerCaseCondition = condition.toLowerCase();
        if (lowerCaseCondition.includes('sun') || lowerCaseCondition.includes('clear')) return <Sun className="h-10 w-10 text-yellow-500"/>;
        if (lowerCaseCondition.includes('cloud') || lowerCaseCondition.includes('overcast')) return <Cloudy className="h-10 w-10 text-gray-500"/>;
        if (lowerCaseCondition.includes('rain') || lowerCaseCondition.includes('drizzle')) return <Umbrella className="h-10 w-10 text-blue-500"/>;
        if (lowerCaseCondition.includes('wind')) return <Wind className="h-10 w-10 text-gray-400"/>;
        return <Sun className="h-10 w-10 text-yellow-500"/>;
    };


    if (isLoading) {
        return <AppLayout title={isHindi ? "लोड हो रहा है..." : "Loading..."}><div className="text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/></div></AppLayout>;
    }
    
    if (!advice || !context) {
        return <AppLayout title={isHindi ? "त्रुटि" : "Error"}><p className="text-center">{isHindi ? "विश्लेषण डेटा लोड नहीं किया जा सका।" : "Could not load analysis data."}</p></AppLayout>
    }

    const recommendationText = advice.recommendation.charAt(0).toUpperCase() + advice.recommendation.slice(1);
    const recommendationHi: {[key: string]: string} = {
        Sell: 'बेचें',
        Wait: 'प्रतीक्षा करें',
        Hold: 'रोकें',
    }

    return (
        <AppLayout title={`${isHindi ? `${context.crop} के लिए बाजार विश्लेषण` : `Market Analysis for ${context.crop}`}`}>
            <div className="space-y-6">
                 <Button variant="outline" onClick={() => router.push('/market-insights')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> {isHindi ? 'विश्लेषण सेटअप पर वापस जाएं' : 'Back to Analysis Setup'}
                </Button>

                <Tabs defaultValue="advisor" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="advisor"><Lightbulb className="mr-2"/>{isHindi ? 'बिक्री सलाहकार' : 'Sell Advisor'}</TabsTrigger>
                        <TabsTrigger value="prices"><TrendingUp className="mr-2"/>{isHindi ? 'लाइव कीमतें' : 'Live Prices'}</TabsTrigger>
                        <TabsTrigger value="news"><Newspaper className="mr-2"/>{isHindi ? 'समाचार और मौसम' : 'News & Weather'}</TabsTrigger>
                        <TabsTrigger value="alerts"><Bell className="mr-2"/>{isHindi ? 'मूल्य अलर्ट' : 'Price Alerts'}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="prices" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{isHindi ? `${context.crop} के लिए लाइव मंडी कीमतें` : `Live Mandi Prices for ${context.crop}`}</CardTitle>
                                <CardDescription>{isHindi ? 'आपके क्षेत्र में सरकारी मंडी पोर्टलों से नवीनतम कीमतें।' : 'Latest prices from government mandi portals in your area.'}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {advice.mandiPrices.length > 0 ? (
                                    advice.mandiPrices.map(mandi => (
                                        <div key={mandi.market} className="flex justify-between items-center p-3 rounded-lg bg-muted">
                                            <div>
                                                <p className="font-semibold">{mandi.market}</p>
                                                <p className="text-sm text-muted-foreground">{context.location}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg text-primary">₹ {mandi.price}/{isHindi ? 'क्विंटल' : 'quintal'}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p>{isHindi ? `आपके क्षेत्र में ${context.crop} के लिए कोई मूल्य डेटा नहीं मिला। दूसरी फसल आजमाएं।` : `No price data found for ${context.crop} in your area. Try another crop.`}</p>
                                )}
                                <PriceChart cropName={context.crop} isHindi={isHindi} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="advisor" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{isHindi ? 'एआई बिक्री सलाहकार' : 'AI Sell Advisor'}</CardTitle>
                                <CardDescription>{isHindi ? 'अभी अपनी फसल बेचें या प्रतीक्षा करें, इस पर एक स्मार्ट सिफारिश प्राप्त करें।' : 'Get a smart recommendation on whether to sell your crop now or wait.'}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="mt-6 p-4 rounded-lg border bg-card">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        {isHindi ? 'सिफारिश:' : 'Recommendation:'}
                                        <Badge variant={advice.recommendation === 'sell' ? 'default' : 'secondary'} className="text-lg">
                                        {isHindi ? recommendationHi[recommendationText] : recommendationText}
                                        </Badge>
                                    </h3>
                                    <p className="mt-2 text-muted-foreground">{advice.reasoning}</p>
                                    <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                                        <div className="p-3 bg-muted rounded-md">
                                            <p className="text-sm text-muted-foreground">{isHindi ? 'अनुमानित मूल्य' : 'Predicted Price'}</p>
                                            <p className="font-bold">{advice.predictedPrice}</p>
                                        </div>
                                        {advice.recommendation === 'sell' && advice.bestMandi && (
                                            <div className="p-3 bg-muted rounded-md">
                                                <p className="text-sm text-muted-foreground">{isHindi ? 'अनुशंसित मंडी' : 'Recommended Mandi'}</p>
                                                <p className="font-bold">{advice.bestMandi.name} @ ₹ {advice.bestMandi.price}/q</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="alerts" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{isHindi ? 'मूल्य अलर्ट सेट करें' : 'Set Price Alerts'}</CardTitle>
                                <CardDescription>{isHindi ? 'जब आपकी फसल एक लक्ष्य मूल्य पर पहुंच जाए तो सूचित करें।' : 'Get notified when your crop reaches a target price.'}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <Label>{isHindi ? 'फसल' : 'Crop'}</Label>
                                        <VoiceInput value={alertCrop} onValueChange={setAlertCrop} fieldName={isHindi ? 'अलर्ट फसल' : 'Alert Crop'}>
                                            <Input placeholder={isHindi ? 'जैसे टमाटर' : 'e.g. Tomato'} value={alertCrop} onChange={e => setAlertCrop(e.target.value)}/>
                                        </VoiceInput>
                                    </div>
                                    <div>
                                        <Label>{isHindi ? 'मूल्य इससे ऊपर होने पर सूचित करें (₹)' : 'Notify when price is above (Rs)'}</Label>
                                        <VoiceInput value={String(alertPrice)} onValueChange={v => setAlertPrice(Number(v) || 0)} fieldName={isHindi ? 'अलर्ट मूल्य' : 'Alert Price'}>
                                            <Input type="number" placeholder={isHindi ? 'जैसे 2500' : 'e.g. 2500'} value={alertPrice || ''} onChange={e => setAlertPrice(Number(e.target.value))}/>
                                        </VoiceInput>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleSaveAlert} disabled={isSavingAlert}>
                                    {isSavingAlert ? <Loader2 className="animate-spin mr-2"/> : <Bell className="mr-2"/>}
                                    {isHindi ? 'अलर्ट सेट करें' : 'Set Alert'}
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                    
                     <TabsContent value="news" className="mt-4">
                        <Card>
                             <CardHeader>
                                <CardTitle>{isHindi ? 'विश्लेषण विवरण और मौसम' : 'Analysis Details & Weather'}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-5 w-5 text-primary"/>
                                        <div><span className="font-semibold">{isHindi ? 'फसल:' : 'Crop:'}</span> {context.crop}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-5 w-5 text-primary"/>
                                        <div><span className="font-semibold">{isHindi ? 'मात्रा:' : 'Quantity:'}</span> {context.quantity} {context.unit}</div>
                                    </div>
                                    <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                                        <MapPin className="h-5 w-5 text-primary"/>
                                        <div><span className="font-semibold">{isHindi ? 'स्थान:' : 'Location:'}</span> {context.location}</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-lg">{isHindi ? '3-दिवसीय पूर्वानुमान' : '3-Day Forecast'}</h3>
                                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {Array.isArray(advice.weather) && advice.weather.map((day, index) => (
                                            <div key={index} className="p-4 rounded-xl bg-primary/10 flex flex-col items-center justify-center text-center">
                                                <h4 className="font-semibold">{day.day}</h4>
                                                <div className="my-2">{getWeatherIcon(day.condition)}</div>
                                                <p className="text-3xl font-bold">{day.temp}°C</p>
                                                <div className="flex items-center gap-2 text-muted-foreground mt-2">
                                                    <Droplets className="h-4 w-4"/>
                                                    <span>{day.humidity}% {isHindi ? 'नमी' : 'humidity'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Umbrella className="h-4 w-4"/>
                                                    <span>{day.rain_probability}% {isHindi ? 'बारिश' : 'rain'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <h3 className="font-semibold text-lg mb-2">{isHindi ? `${context.crop} के लिए हालिया समाचार` : `Recent News for ${context.crop}`}</h3>
                                    <div className="space-y-3">
                                        {advice.news.length > 0 ? advice.news.map(item => (
                                            <a href={item.link} target="_blank" rel="noopener noreferrer" key={item.title} className="block p-3 rounded-lg border hover:bg-muted">
                                                <p className="font-semibold">{item.title}</p>
                                                <p className="text-sm text-muted-foreground">{item.summary}</p>
                                            </a>
                                        )) : <p>{isHindi ? `${context.crop} के लिए कोई हालिया समाचार नहीं मिला।` : `No recent news found for ${context.crop}.`}</p>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
