
'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { VoiceInput } from '@/components/VoiceInput';
import { schemes as allSchemeData } from '@/lib/schemes';
import type { Scheme, PopulatedScheme } from '@/lib/types';
import { findRelevantSchemes } from '@/ai/flows/search-schemes';
import { populateSchemeDetails } from '@/ai/flows/populate-scheme-details';
import { Loader2, Search, Locate, FileText, UserCheck, ScrollText, BadgeHelp, Phone, ExternalLink, Bot, Calendar, Mail, Building2, Award, FileCheck2, Users, ArrowRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";


const sectionStyles: Record<string, string> = {
  benefits: 'border-green-500 bg-green-500/10',
  eligibility: 'border-blue-500 bg-blue-500/10',
  howToApply: 'border-purple-500 bg-purple-500/10',
  requiredDocuments: 'border-orange-500 bg-orange-500/10',
  contact: 'border-slate-500 bg-slate-500/10',
};

function SchemeCard({ scheme, isHindi }: { scheme: PopulatedScheme, isHindi: boolean }) {
    
    const cardTranslations = {
        benefits: "लाभ",
        eligibility: "पात्रता",
        howToApply: "आवेदन कैसे करें",
        documents: "दस्तावेज़",
        contact: "संपर्क",
        officialWebsite: "आधिकारिक वेबसाइट",
        askAIAgent: "एआई एजेंट से पूछें",
        notAvailable: "उपलब्ध नहीं है",
        centralScheme: "केंद्रीय योजना",
        stateScheme: "राज्य योजना",
    };

    return (
        <Card className="flex flex-col rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
            <div className="p-4 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                <div className="flex justify-between items-center mb-2">
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">{scheme.state === 'All India' ? (isHindi ? cardTranslations.centralScheme : 'Central Scheme') : `${scheme.state} ${isHindi ? cardTranslations.stateScheme : 'State Scheme'}`}</Badge>
                    <div className="flex items-center gap-2 text-xs opacity-90">
                        <Calendar size={14}/>
                        <span>{scheme.lastUpdated}</span>
                    </div>
                </div>
                <h3 className="font-headline text-lg font-bold">{scheme.title}</h3>
                <p className="mt-1 opacity-90 text-sm leading-relaxed">{scheme.description}</p>
            </div>
            <CardContent className="p-3 bg-background flex-grow space-y-2">
                 <div className={`p-2 rounded-lg border-l-4 ${sectionStyles.benefits}`}>
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-1"><Award size={14}/>{isHindi ? cardTranslations.benefits : 'Benefits'}</h4>
                    <p className="text-muted-foreground text-xs">{scheme.benefits}</p>
                </div>

                <div className={`p-2 rounded-lg border-l-4 ${sectionStyles.eligibility}`}>
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-1"><Users size={14}/>{isHindi ? cardTranslations.eligibility : 'Eligibility'}</h4>
                    <p className="text-muted-foreground text-xs">{scheme.eligibility}</p>
                </div>
                 <div className={`p-2 rounded-lg border-l-4 ${sectionStyles.howToApply}`}>
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-1"><FileText size={14}/>{isHindi ? cardTranslations.howToApply : 'How To Apply'}</h4>
                    <p className="text-muted-foreground text-xs">{scheme.howToApply}</p>
                </div>
                 <div className={`p-2 rounded-lg border-l-4 ${sectionStyles.requiredDocuments}`}>
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-1"><FileCheck2 size={14}/>{isHindi ? cardTranslations.documents : 'Documents'}</h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                         {scheme.requiredDocuments.split(',').map(doc => doc.trim()).filter(Boolean).map((doc, i) => (
                           <Badge key={i} variant="outline" className="bg-white text-xs font-normal">{doc}</Badge>
                        ))}
                    </div>
                </div>
                 <div className={`p-2 rounded-lg border-l-4 ${sectionStyles.contact}`}>
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-1"><Building2 size={14}/>{isHindi ? cardTranslations.contact : 'Contact'}</h4>
                    <div className="space-y-1 text-muted-foreground text-xs">
                        <div className="flex items-center gap-2">
                            <Building2 size={12} />
                            <span>{scheme.contact.department}</span>
                        </div>
                         <div className="flex items-center gap-2">
                            <Phone size={12} />
                            <span>{scheme.contact.phone !== '--' ? scheme.contact.phone : (isHindi ? cardTranslations.notAvailable : 'Not Available')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail size={12} />
                            <span>{scheme.contact.email !== '--' ? scheme.contact.email : (isHindi ? cardTranslations.notAvailable : 'Not Available')}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-3 bg-muted/50 flex flex-wrap gap-2 justify-start">
                  <Button asChild size="sm">
                    <a href={scheme.website} target="_blank" rel="noopener noreferrer">
                      {isHindi ? cardTranslations.officialWebsite : 'Official Website'} <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="secondary" size="sm">
                    <Bot className="mr-2 h-4 w-4" /> {isHindi ? cardTranslations.askAIAgent : 'Ask AI Agent'}
                  </Button>
            </CardFooter>
        </Card>
    )
}

export default function SchemesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedState, setSelectedState] = useState<string>('All India');
    const [isSearching, setIsSearching] = useState(false);
    const [schemes, setSchemes] = useState<PopulatedScheme[]>([]);
    const [isClient, setIsClient] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [schemesPerPage] = useState(6);
    const [totalSchemes, setTotalSchemes] = useState(0);
    const [currentSchemeIds, setCurrentSchemeIds] = useState<string[]>([]);
    
    const { user } = useAuth();
    const { toast } = useToast();
    const isHindi = user?.language === 'hi';

    const allStates = useMemo(() => ['All India', ...Array.from(new Set(allSchemeData.map(s => s.state).filter(s => s !== 'All India'))).sort()], []);
    
    const populateAndSetSchemes = async (schemeIds: string[]) => {
        setIsSearching(true);
        try {
            const populatedSchemesPromises = schemeIds.map(async (id) => {
                const baseScheme = allSchemeData.find(s => s.id === id);
                if (!baseScheme) return null;
                const details = await populateSchemeDetails({ schemeId: id, language: user?.language || 'en' });
                return { ...baseScheme, ...details };
            });

            const populatedSchemes = (await Promise.all(populatedSchemesPromises)).filter(Boolean) as PopulatedScheme[];
            setSchemes(populatedSchemes);

        } catch (error) {
            console.error("Error populating scheme details:", error);
            toast({ title: isHindi ? "एआई त्रुटि" : "AI Error", description: isHindi ? "योजनाओं के लिए विवरण प्राप्त करने में विफल।" : "Failed to get details for schemes.", variant: "destructive" });
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        setIsClient(true);
        const allIds = allSchemeData.map(s => s.id);
        setCurrentSchemeIds(allIds);
        setTotalSchemes(allIds.length);
    }, []);

    useEffect(() => {
        if (!isClient) return;

        const startIndex = (currentPage - 1) * schemesPerPage;
        const endIndex = startIndex + schemesPerPage;
        const idsToPopulate = currentSchemeIds.slice(startIndex, endIndex);

        if (idsToPopulate.length > 0) {
            populateAndSetSchemes(idsToPopulate);
        } else {
            setSchemes([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, currentSchemeIds, isClient]);

    const handleFilterOrSearch = async (query: string, state: string) => {
        setIsSearching(true);
        setCurrentPage(1);

        let filteredIds: string[];

        // State-based filtering
        let stateFiltered = allSchemeData.filter(s => {
            if (state === 'All India') return true;
            return s.state === state || s.category === 'Central';
        });

        if (query.trim()) {
            try {
                const result = await findRelevantSchemes({
                    query,
                    schemeIds: stateFiltered.map(s => s.id),
                    language: user?.language || 'en'
                });

                if (result.relevantSchemeIds.length === 0) {
                    toast({ title: isHindi ? "कोई योजना नहीं मिली" : "No schemes found", description: isHindi ? "आपकी खोज किसी भी योजना से मेल नहीं खाती।" : "Your query did not match any schemes." });
                    filteredIds = [];
                } else {
                    filteredIds = result.relevantSchemeIds;
                }
            } catch (error) {
                console.error("Error searching schemes:", error);
                toast({ title: isHindi ? "एआई त्रुटि" : "AI Error", description: isHindi ? "एआई खोज करने में विफल।" : "Failed to perform AI search.", variant: "destructive" });
                filteredIds = [];
            }
        } else {
            filteredIds = stateFiltered.map(s => s.id);
        }

        setCurrentSchemeIds(filteredIds);
        setTotalSchemes(filteredIds.length);
        setIsSearching(false);
    };
    
    const totalPages = Math.ceil(totalSchemes / schemesPerPage);
    
    return (
        <AppLayout title={isHindi ? 'सरकारी योजनाएं' : 'Government Schemes'}>
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-4xl font-bold">{isHindi ? 'किसानों के लिए सरकारी योजनाएं' : 'Government Schemes for Farmers'}</h1>
                    <p className="text-muted-foreground mt-2">{isHindi ? 'उन योजनाओं को खोजें और समझें जो आपकी खेती में मदद कर सकती हैं।' : 'Find and understand schemes that can help your farming.'}</p>
                </div>

                <Card className="shadow-lg">
                    <CardContent className="p-4 space-y-4">
                         <div className="flex flex-col md:flex-row gap-2">
                             <div className="flex-grow">
                                <VoiceInput value={searchQuery} onValueChange={setSearchQuery} fieldName={isHindi ? 'योजना खोज' : "Scheme Search"}>
                                    <Input 
                                        placeholder={isHindi ? 'मैं गेहूं उगा रहा हूं, प्रासंगिक योजनाएं सुझाएं...' : 'I am growing wheat, suggest relevant schemes...'}
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleFilterOrSearch(searchQuery, selectedState)}
                                    />
                                </VoiceInput>
                            </div>
                            <Button onClick={() => handleFilterOrSearch(searchQuery, selectedState)} disabled={isSearching} className="w-full md:w-auto">
                                {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />} {isHindi ? 'खोजें' : 'Search'}
                            </Button>
                            <Select value={selectedState} onValueChange={(value) => { setSelectedState(value); handleFilterOrSearch(searchQuery, value);}} disabled={isSearching}>
                                <SelectTrigger className="w-full md:w-[200px]">
                                    <SelectValue placeholder={isHindi ? 'राज्य द्वारा फ़िल्टर करें' : 'Filter by State'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {allStates.map(state => (
                                        <SelectItem key={state} value={state}>{state === 'All India' ? (isHindi ? 'अखिल भारतीय' : 'All India') : state}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                         </div>
                         {selectedState && selectedState !== 'All India' && (
                             <Alert className="bg-blue-500/10 border-blue-500/50">
                                <Locate className="h-4 w-4 !text-blue-600" />
                                <AlertTitle className="text-blue-800">{isHindi ? 'स्थान फ़िल्टर सक्रिय' : 'Location Filter Active'}</AlertTitle>
                                <AlertDescription className="text-blue-700">
                                    {isHindi ? `${selectedState} और केंद्र सरकार के लिए योजनाएं दिखाई जा रही हैं। आप फ़िल्टर का उपयोग करके इसे बदल सकते हैं।` : `Showing schemes for ${selectedState} and central government. You can change this using the filter.`}
                                </AlertDescription>
                            </Alert>
                         )}
                    </CardContent>
                </Card>
                
                <div>
                    <p className="text-sm text-muted-foreground mb-4">{isHindi ? `${totalSchemes} योजनाओं में से ${schemes.length} योजनाएं दिखा रहा है।` : `Showing ${schemes.length} of ${totalSchemes} schemes.`}</p>
                    {isSearching ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                            {schemes.map(scheme => (
                                <SchemeCard key={scheme.id} scheme={scheme} isHindi={isHindi}/>
                            ))}
                             {schemes.length === 0 && !isSearching && (
                                 <div className="text-center py-12 text-muted-foreground lg:col-span-2">
                                     <Search className="mx-auto h-12 w-12"/>
                                     <h3 className="mt-2 text-xl font-semibold">{isHindi ? 'कोई योजना नहीं मिली' : 'No Schemes Found'}</h3>
                                     <p className="mt-1 text-sm">{isHindi ? 'आपकी खोज या फ़िल्टर से कोई परिणाम नहीं मिला। एक अलग क्वेरी या राज्य का प्रयास करें।' : 'Your search or filter did not yield any results. Try a different query or state.'}</p>
                                 </div>
                             )}
                        </div>
                        {totalPages > 1 && (
                            <Pagination className="mt-8">
                              <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious 
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(p - 1, 1)); }}
                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                                   >{isHindi ? 'पिछला' : 'Previous'}</PaginationPrevious>
                                </PaginationItem>
                                <PaginationItem>
                                    <span className="p-2 text-sm">{isHindi ? `पृष्ठ ${currentPage} का ${totalPages}` : `Page ${currentPage} of ${totalPages}`}</span>
                                </PaginationItem>
                                <PaginationItem>
                                  <PaginationNext 
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(p + 1, totalPages)); }}
                                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
                                  >{isHindi ? 'अगला' : 'Next'}</PaginationNext>
                                </PaginationItem>
                              </PaginationContent>
                            </Pagination>
                        )}
                      </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
