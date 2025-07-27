
'use client';

import { useState, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import Image from 'next/image';

export default function CreatePostPage() {
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user, firebaseUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isHindi = user?.language === 'hi';

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast({ title: isHindi ? "छवि बहुत बड़ी है" : "Image too large", description: isHindi ? "कृपया 5MB से छोटी छवि चुनें।" : "Please select an image smaller than 5MB.", variant: "destructive" });
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!content.trim() && !imageFile) {
            toast({ title: isHindi ? "खाली पोस्ट" : "Empty Post", description: isHindi ? "कृपया कुछ सामग्री लिखें या एक छवि अपलोड करें।" : "Please write some content or upload an image.", variant: "destructive" });
            return;
        }
        if (!firebaseUser || !user) {
            toast({ title: isHindi ? "प्रमाणीकरण त्रुटि" : "Authentication Error", description: isHindi ? "पोस्ट बनाने के लिए आपको लॉग इन होना चाहिए।" : "You must be logged in to create a post.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        let imageUrl = '';

        try {
            // Step 1: Upload image if one is selected
            if (imageFile) {
                const imageRef = ref(storage, `community-images/${firebaseUser.uid}/${Date.now()}_${imageFile.name}`);
                try {
                    const snapshot = await uploadBytes(imageRef, imageFile);
                    imageUrl = await getDownloadURL(snapshot.ref);
                } catch (uploadError) {
                    console.error("Error uploading image:", uploadError);
                    toast({ title: isHindi ? "अपलोड त्रुटि" : "Upload Error", description: isHindi ? "छवि अपलोड नहीं की जा सकी। कृपया भंडारण नियमों और नेटवर्क की जांच करें।" : "Could not upload the image. Please check storage rules and network.", variant: "destructive" });
                    setIsSubmitting(false);
                    return;
                }
            }

            // Step 2: Create post document in Firestore
            const postData = {
                userId: firebaseUser.uid,
                userName: user.name,
                userAvatar: user.avatarUrl || `https://placehold.co/100x100.png`,
                content,
                imageUrl, // will be empty string if no image was uploaded
                timestamp: serverTimestamp(),
                likesCount: 0,
                commentsCount: 0,
                likedBy: [],
            };
            
            try {
                await addDoc(collection(db, 'communityPosts'), postData);
                toast({ title: isHindi ? "सफलता" : "Success", description: isHindi ? "आपकी पोस्ट प्रकाशित हो गई है!" : "Your post has been published!" });
                router.push('/community');
            } catch (firestoreError) {
                 console.error("Error creating post in Firestore:", firestoreError);
                toast({ title: isHindi ? "डेटाबेस त्रुटि" : "Database Error", description: isHindi ? "आपकी पोस्ट को सहेजा नहीं जा सका।" : "Could not save your post.", variant: "destructive" });
            }

        } catch (error) {
            console.error("An unexpected error occurred:", error);
            toast({ title: isHindi ? "त्रुटि" : "Error", description: isHindi ? "एक अप्रत्याशित त्रुटि हुई। कृपया पुनः प्रयास करें।" : "An unexpected error occurred. Please try again.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppLayout title={isHindi ? 'नई पोस्ट बनाएं' : 'Create a New Post'}>
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>{isHindi ? 'समुदाय के साथ साझा करें' : 'Share with the Community'}</CardTitle>
                        <CardDescription>{isHindi ? 'आज आपके खेत पर क्या हो रहा है?' : "What's happening on your farm today?"}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            placeholder={isHindi ? 'अपने विचार साझा करें, एक प्रश्न पूछें, या एक अपडेट पोस्ट करें...' : "Share your thoughts, ask a question, or post an update..."}
                            rows={6}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            maxLength={1000}
                        />

                        <div className="space-y-2">
                             <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" />
                                {imagePreview ? (isHindi ? 'छवि बदलें' : 'Change Image') : (isHindi ? 'एक छवि अपलोड करें' : 'Upload an Image')}
                            </Button>
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                            {imagePreview && (
                                <div className="mt-4 rounded-lg overflow-hidden border w-48 h-48 relative">
                                    <Image src={imagePreview} alt="Image preview" fill className="object-cover" />
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">{isHindi ? 'वैकल्पिक। अधिकतम फ़ाइल आकार: 5MB।' : 'Optional. Max file size: 5MB.'}</p>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                                {isHindi ? 'रद्द करें' : 'Cancel'}
                            </Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {isHindi ? 'सबमिट हो रहा है...' : 'Submitting...'}
                                    </>
                                ) : (
                                    isHindi ? 'पोस्ट सबमिट करें' : 'Submit Post'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
