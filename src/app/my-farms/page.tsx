
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Users, AlertTriangle, Info, HeartPulse, LineChart, ClipboardCheck, Banknote, ArrowRight, Plus, Tractor, Trash2, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { Farm } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import FarmDialog from '@/components/FarmDialog';

const services = [
  {
    icon: <HeartPulse className="h-8 w-8 text-primary" />,
    title: 'Disease Diagnosis',
    titleHi: 'रोग निदान',
    description: 'Upload a photo of your crop to identify diseases and get solutions.',
    descriptionHi: 'बीमारियों की पहचान करने और समाधान पाने के लिए अपनी फसल की तस्वीर अपलोड करें।',
    href: '/disease-diagnosis',
  },
  {
    icon: <LineChart className="h-8 w-8 text-primary" />,
    title: 'Market Insights',
    titleHi: 'बाजार जानकारी',
    description: 'Get the latest mandi rates for your crops.',
    descriptionHi: 'अपनी फसलों के लिए नवीनतम मंडी दरें प्राप्त करें।',
    href: '/market-insights',
  },
  {
    icon: <ClipboardCheck className="h-8 w-8 text-primary" />,
    title: 'Crop Planning',
    titleHi: 'फसल योजना',
    description: 'Get a full crop lifecycle plan, from sowing to harvest.',
    descriptionHi: 'बुवाई से लेकर कटाई तक, पूरी फसल जीवनचक्र योजना प्राप्त करें।',
    href: '/crop-planner',
  },
  {
    icon: <Banknote className="h-8 w-8 text-primary" />,
    title: 'Government Schemes',
    titleHi: 'सरकारी योजनाएं',
    description: 'Discover and apply for beneficial government schemes.',
    descriptionHi: 'लाभकारी सरकारी योजनाओं की खोज करें और उनके लिए आवेदन करें।',
    href: '/schemes',
  },
];


export default function MyFarmsPage() {
  const { user, firebaseUser } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoadingFarms, setIsLoadingFarms] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const { toast } = useToast();
  const isHindi = user?.language === 'hi';

  const translations: { [key: string]: string } = {
    'acres': 'एकड़',
    'hectares': 'हेक्टेयर',
    'Wheat': 'गेहूँ',
    'Tomato': 'टमाटर',
    'Sugarcane': 'गन्ना',
    'Cotton': 'कपास',
    'Rice': 'चावल',
    'Maize': 'मक्का',
    'Wheat field': 'गेहूँ का खेत',
    'My Farm': 'मेरा खेत'
  };

  const translate = (text: string | undefined): string => {
    if (!text) return '';
    if (isHindi && translations[text]) {
        return translations[text];
    }
    return text;
  };

  useEffect(() => {
    if (!firebaseUser) return;
    setIsLoadingFarms(true);
    const q = query(collection(db, 'farms'), where('userId', '==', firebaseUser.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const farmsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Farm));
      setFarms(farmsData);
      setIsLoadingFarms(false);
    }, (error) => {
      console.error("Error fetching farms:", error);
      toast({ title: 'Error', description: 'Could not load farms.', variant: 'destructive' });
      setIsLoadingFarms(false);
    });
    return () => unsubscribe();
  }, [firebaseUser, toast]);

  const handleAddNewFarm = () => {
    setSelectedFarm(null);
    setIsDialogOpen(true);
  };

  const handleEditFarm = (farm: Farm) => {
    setSelectedFarm(farm);
    setIsDialogOpen(true);
  };

  const handleDeleteFarm = async (farmId: string) => {
    if (!window.confirm(isHindi ? 'क्या आप वाकई इस खेत को हटाना चाहते हैं?' : 'Are you sure you want to delete this farm?')) return;
    try {
      await deleteDoc(doc(db, 'farms', farmId));
      toast({ title: isHindi ? 'खेत हटा दिया गया' : 'Farm Deleted', description: isHindi ? 'खेत सफलतापूर्वक हटा दिया गया है।' : 'The farm has been successfully deleted.' });
    } catch (error) {
      console.error('Error deleting farm:', error);
      toast({ title: isHindi ? 'त्रुटि' : 'Error', description: isHindi ? 'खेत को हटाया नहीं जा सका।' : 'Could not delete the farm.', variant: 'destructive' });
    }
  };

  const handleSaveFarm = async (farmData: Omit<Farm, 'id' | 'userId'>, id?: string) => {
    if (!firebaseUser) return;
    try {
      if (id) {
        // Update existing farm
        const farmRef = doc(db, 'farms', id);
        await updateDoc(farmRef, farmData);
        toast({ title: isHindi ? 'खेत अपडेट किया गया' : 'Farm Updated', description: isHindi ? 'आपके खेत का विवरण अपडेट कर दिया गया है।' : 'Your farm details have been updated.' });
      } else {
        // Add new farm
        await addDoc(collection(db, 'farms'), { ...farmData, userId: firebaseUser.uid });
        toast({ title: isHindi ? 'खेत जोड़ा गया' : 'Farm Added', description: isHindi ? 'आपका नया खेत सहेज लिया गया है।' : 'Your new farm has been saved.' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving farm:', error);
      toast({ title: 'Error', description: 'Could not save farm details.', variant: 'destructive' });
    }
  };
  
  return (
    <AppLayout title={isHindi ? 'डैशबोर्ड' : 'Dashboard'}>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{isHindi ? 'नमस्ते' : 'Welcome'}, {user?.name ? `${user.name}` : (isHindi ? 'किसान' : 'Farmer')}!</h1>
          <p className="text-muted-foreground">{isHindi ? 'कृषि में आपका एआई-संचालित साथी।' : 'Your AI-powered companion in agriculture.'}</p>
        </div>

        {/* My Farms Section */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                 <h2 className="text-2xl font-bold text-gray-800">{isHindi ? 'मेरे खेत' : 'My Farms'}</h2>
                 <Button onClick={handleAddNewFarm}><Plus className="mr-2 h-4 w-4"/>{isHindi ? 'नया खेत जोड़ें' : 'Add New Farm'}</Button>
            </div>
            {isLoadingFarms ? (
                <p>{isHindi ? 'खेत लोड हो रहे हैं...' : 'Loading farms...'}</p>
            ) : farms.length > 0 ? (
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {farms.map(farm => (
                        <Card key={farm.id}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Tractor/>{translate(farm.name)}</CardTitle>
                                <CardDescription>{farm.location}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p><strong>{isHindi ? 'मुख्य फसल:' : 'Main Crop:'}</strong> {translate(farm.mainCrop)}</p>
                                <p><strong>{isHindi ? 'क्षेत्र:' : 'Area:'}</strong> {farm.size} {translate(farm.sizeUnit)}</p>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEditFarm(farm)}><Edit className="mr-2 h-4 w-4" />{isHindi ? 'संपादित करें' : 'Edit'}</Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteFarm(farm.id)}><Trash2 className="mr-2 h-4 w-4" />{isHindi ? 'हटाएं' : 'Delete'}</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                 <div className="text-center py-10 rounded-lg border-2 border-dashed">
                    <h3 className="text-xl font-semibold">{isHindi ? 'अभी तक कोई खेत नहीं है' : 'No farms yet'}</h3>
                    <p className="text-muted-foreground mt-2">{isHindi ? 'व्यक्तिगत जानकारी प्राप्त करने के लिए अपना पहला खेत जोड़ें।' : 'Add your first farm to get personalized insights.'}</p>
                     <Button onClick={handleAddNewFarm} className="mt-4"><Plus className="mr-2 h-4 w-4"/>{isHindi ? 'खेत जोड़ें' : 'Add a Farm'}</Button>
                </div>
            )}
        </div>
        
         <FarmDialog 
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            onSave={handleSaveFarm}
            farm={selectedFarm}
        />

        {/* Farmer Feedback Banner */}
        <div className="bg-green-600/10 border-l-4 border-green-600 text-green-800 p-4 rounded-r-lg flex items-center gap-4">
          <Users className="h-8 w-8 flex-shrink-0" />
          <div>
            <h3 className="font-semibold">{isHindi ? 'किसानों की प्रतिक्रिया से तैयार' : 'Tailored with Farmer Feedback'}</h3>
            <p className="text-sm">{isHindi ? 'हमने अपनी सुविधाओं को बेहतर बनाने के लिए 20 से अधिक किसानों के साथ काम किया है, यह सुनिश्चित करते हुए कि वे आपकी वास्तविक जरूरतों को पूरा करते हैं।' : "We've worked with over 20 farmers to refine our features, ensuring they meet your real-world needs."}</p>
          </div>
        </div>

        {/* Alerts Section */}
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">{isHindi ? 'चेतावनी' : 'Alerts'}</h2>
            <div className="grid md:grid-cols-2 gap-4">
                <Alert variant="destructive" className="bg-red-500/10 border-l-4 border-red-500">
                    <AlertTriangle className="h-4 w-4 !text-red-500" />
                    <AlertTitle className="font-semibold text-red-700">{isHindi ? 'भारी बारिश का पूर्वानुमान' : 'Heavy Rain Forecast'}</AlertTitle>
                    <AlertDescription className="text-red-600">
                        {isHindi ? 'अगले 48 घंटों में आपके क्षेत्र में भारी बारिश की उम्मीद है। सिंचाई स्थगित करने और अपने खेतों के लिए उचित जल निकासी सुनिश्चित करने पर विचार करें।' : 'Heavy rainfall is expected in your area in the next 48 hours. Consider postponing irrigation and ensuring proper drainage for your fields.'}
                    </AlertDescription>
                </Alert>
                 <Alert className="bg-blue-500/10 border-l-4 border-blue-500">
                    <Info className="h-4 w-4 !text-blue-500" />
                    <AlertTitle className="font-semibold text-blue-700">{isHindi ? 'पीएम-किसान अपडेट' : 'PM-KISAN Update'}</AlertTitle>
                    <AlertDescription className="text-blue-600">
                       {isHindi ? 'पीएम-किसान योजना की अगली किस्त इस महीने के अंत तक जारी होने वाली है। सुनिश्चित करें कि आपका eKYC पूरा हो गया है।' : 'The next installment of the PM-KISAN scheme is scheduled to be released by the end of this month. Ensure your eKYC is complete.'}
                    </AlertDescription>
                </Alert>
            </div>
        </div>
        
        {/* Our Services Section */}
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">{isHindi ? 'हमारी सेवाएं' : 'Our Services'}</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                    <Card key={service.title} className="bg-green-500/5 hover:shadow-lg hover:border-primary/20 transition-all flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-4">
                                {service.icon}
                                <span className="text-lg">{isHindi ? service.titleHi : service.title}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <p className="text-sm text-muted-foreground">{isHindi ? service.descriptionHi : service.description}</p>
                        </CardContent>
                        <CardFooter>
                           <Button asChild variant="link" className="text-primary p-0">
                             <Link href={service.href}>
                                {isHindi ? 'अन्वेषण करें' : 'Explore'} <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                           </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
      </div>
    </AppLayout>
  );
}
