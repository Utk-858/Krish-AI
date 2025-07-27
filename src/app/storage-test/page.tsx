
'use client';

import { useState, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, CheckCircle, AlertCircle, MapPin, Phone, Search } from 'lucide-react';
import Image from 'next/image';
import { findSuppliers } from '@/ai/flows/find-suppliers';
import type { FindSuppliersOutput } from '@/lib/types';

type Supplier = FindSuppliersOutput['suppliers'][0];

export default function StorageTestPage() {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [downloadURL, setDownloadURL] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    
    // State for supplier test
    const [searchLocation, setSearchLocation] = useState('Bengaluru');
    const [isFinding, setIsFinding] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [placesError, setPlacesError] = useState<string | null>(null);


    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setImageFile(file);
            setDownloadURL(null);
            setUploadError(null);
        }
    };

    const handleUpload = async () => {
        if (!imageFile) {
            toast({
                title: 'No file selected',
                description: 'Please select an image file to upload.',
                variant: 'destructive',
            });
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadError(null);
        setDownloadURL(null);

        // Create a storage reference
        const storageRef = ref(storage, `test-uploads/${Date.now()}_${imageFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, imageFile);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                // Handle unsuccessful uploads
                console.error("Upload Error:", error);
                setUploadError(`Upload failed: ${error.message}. Check storage rules and network.`);
                toast({
                    title: 'Upload Failed',
                    description: 'Please check the console and your Firebase Storage rules.',
                    variant: 'destructive',
                });
                setIsUploading(false);
            },
            () => {
                // Handle successful uploads on complete
                getDownloadURL(uploadTask.snapshot.ref).then((url) => {
                    setDownloadURL(url);
                    setIsUploading(false);
                    toast({
                        title: 'Upload Successful!',
                        description: 'Your file is now in Firebase Storage.',
                    });
                });
            }
        );
    };

    const handleFindSuppliers = async () => {
        if (!searchLocation) {
            toast({
                title: 'Location required',
                description: 'Please enter a location to search for suppliers.',
                variant: 'destructive'
            });
            return;
        }
        setIsFinding(true);
        setPlacesError(null);
        setSuppliers([]);
        try {
            const result = await findSuppliers({ location: searchLocation });
            if (result.suppliers.length === 0) {
                 toast({ title: "No suppliers found", description: "The search completed, but no suppliers were found for that location."});
            }
            setSuppliers(result.suppliers);
        } catch (error) {
            console.error("Error finding suppliers:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setPlacesError(errorMessage);
            toast({ title: 'Search Failed', description: 'Could not fetch suppliers.', variant: 'destructive'});
        } finally {
            setIsFinding(false);
        }
    };

    return (
        <AppLayout title="Feature Test Suite">
            <div className="max-w-2xl mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Test Firebase Storage</CardTitle>
                        <CardDescription>
                            This page allows you to test if file uploads to your Firebase Storage bucket are working correctly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="file-upload">1. Select an Image File</Label>
                            <Input id="file-upload" type="file" accept="image/*" onChange={handleFileSelect} ref={fileInputRef} />
                            {imageFile && <p className="text-sm text-muted-foreground">Selected: {imageFile.name}</p>}
                        </div>

                        <Button onClick={handleUpload} disabled={isUploading || !imageFile}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            2. Upload to Storage
                        </Button>

                        {isUploading && (
                            <div className="space-y-2">
                                <Label>Upload Progress</Label>
                                <Progress value={uploadProgress} />
                                <p className="text-sm text-center text-muted-foreground">{Math.round(uploadProgress)}%</p>
                            </div>
                        )}

                        {uploadError && (
                             <div className="p-4 rounded-md bg-destructive/10 text-destructive flex items-center gap-3">
                                <AlertCircle className="h-5 w-5"/>
                                <div>
                                    <h4 className="font-semibold">Error</h4>
                                    <p className="text-sm">{uploadError}</p>
                                </div>
                            </div>
                        )}

                        {downloadURL && (
                            <div className="space-y-4 pt-4">
                                <div className="p-4 rounded-md bg-green-500/10 text-green-700 flex items-center gap-3">
                                    <CheckCircle className="h-5 w-5 text-green-500"/>
                                    <div>
                                        <h4 className="font-semibold">Success! Image is Hosted on Firebase</h4>
                                        <p className="text-sm">The image below is being served directly from Firebase Storage.</p>
                                    </div>
                                </div>
                                <div className="rounded-lg overflow-hidden border aspect-video relative">
                                    <Image src={downloadURL} alt="Uploaded from Firebase" fill className="object-contain" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Image URL</Label>
                                    <Input readOnly value={downloadURL} className="text-xs"/>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Test Places API & Find Suppliers</CardTitle>
                        <CardDescription>
                            Test the supplier search functionality to ensure the Places API is working correctly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="location-search">1. Enter Location</Label>
                            <Input id="location-search" value={searchLocation} onChange={(e) => setSearchLocation(e.target.value)} placeholder="e.g. Bengaluru, Karnataka"/>
                        </div>
                        <Button onClick={handleFindSuppliers} disabled={isFinding}>
                            {isFinding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            2. Find Suppliers
                        </Button>
                        
                        {isFinding && (
                            <div className="flex justify-center items-center py-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                                <p className="ml-2">Searching for suppliers...</p>
                            </div>
                        )}

                        {placesError && (
                            <div className="p-4 rounded-md bg-destructive/10 text-destructive flex items-center gap-3">
                                <AlertCircle className="h-5 w-5"/>
                                <p className="text-sm">{placesError}</p>
                            </div>
                        )}

                        {suppliers.length > 0 && (
                            <div className="space-y-4 pt-4">
                                <h4 className="font-semibold">Search Results ({suppliers.length} found)</h4>
                                <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                                    {suppliers.map((supplier, index) => (
                                        <div key={index} className="p-3 border rounded-lg">
                                            <h3 className="font-semibold">{supplier.name}</h3>
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
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
