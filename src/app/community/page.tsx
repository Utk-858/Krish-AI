
'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, MessageSquare, ThumbsUp, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, runTransaction, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { CommunityPost } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function CommunityPage() {
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, firebaseUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const isHindi = user?.language === 'hi';

    useEffect(() => {
        const postsCollection = collection(db, 'communityPosts');
        const q = query(postsCollection, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => {
                const data = doc.data();
                // Firestore server timestamps can be null initially. Convert to ISO string or use current time as fallback.
                const timestamp = data.timestamp ? data.timestamp.toDate().toISOString() : null;
                return { id: doc.id, ...data, timestamp } as CommunityPost;
            });
            setPosts(postsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching posts: ", error);
            toast({ title: isHindi ? "त्रुटि" : "Error", description: isHindi ? "सामुदायिक पोस्ट नहीं ला सका।" : "Could not fetch community posts.", variant: "destructive" });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast, isHindi]);

    const handleLike = async (postId: string) => {
        if (!firebaseUser) {
            toast({ title: isHindi ? "प्रमाणीकरण त्रुटि" : "Authentication Error", description: isHindi ? "पोस्ट को लाइक करने के लिए आपको लॉग इन होना चाहिए।" : "You must be logged in to like a post.", variant: "destructive" });
            return;
        }

        const postRef = doc(db, 'communityPosts', postId);
        
        try {
            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) {
                    throw "Post does not exist!";
                }

                const postData = postDoc.data();
                const isLiked = (postData.likedBy || []).includes(firebaseUser.uid);
                const newLikesCount = (postData.likesCount || 0) + (isLiked ? -1 : 1);

                transaction.update(postRef, {
                    likedBy: isLiked ? arrayRemove(firebaseUser.uid) : arrayUnion(firebaseUser.uid),
                    likesCount: newLikesCount
                });
            });
        } catch (error) {
            console.error("Error updating like: ", error);
            toast({ title: isHindi ? "त्रुटि" : "Error", description: isHindi ? "लाइक अपडेट नहीं कर सका। कृपया पुनः प्रयास करें।" : "Could not update like. Please try again.", variant: "destructive" });
        }
    };
    
    const getInitials = (name: string) => (name || '').split(' ').map((n) => n[0]).join('');

    return (
        <AppLayout title={isHindi ? 'सामुदायिक मंच' : 'Community Forum'}>
            <div className="max-w-3xl mx-auto space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Avatar>
                            <AvatarImage src={user?.avatarUrl || ''} data-ai-hint="user avatar"/>
                            <AvatarFallback>{user?.name ? getInitials(user.name) : 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                             <Button variant="outline" className="w-full text-left justify-start text-muted-foreground" onClick={() => router.push('/community/post')}>
                                {isHindi ? `आपके मन में क्या है, ${user?.name}?` : `What's on your mind, ${user?.name}?`}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardFooter className="flex justify-end">
                        <Button onClick={() => router.push('/community/post')}>
                            <Plus className="mr-2 h-4 w-4" /> {isHindi ? 'पोस्ट बनाएं' : 'Create Post'}
                        </Button>
                    </CardFooter>
                </Card>

                {isLoading ? (
                    <div className="text-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="mt-2 text-muted-foreground">{isHindi ? 'पोस्ट लोड हो रहे हैं...' : 'Loading posts...'}</p>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-10 rounded-lg border-2 border-dashed">
                        <h3 className="text-xl font-semibold">{isHindi ? 'अभी तक कोई पोस्ट नहीं है' : 'No posts yet'}</h3>
                        <p className="text-muted-foreground mt-2">{isHindi ? 'समुदाय के साथ कुछ साझा करने वाले पहले व्यक्ति बनें!' : 'Be the first to share something with the community!'}</p>
                    </div>
                ) : (
                    posts.map(post => (
                        <Card key={post.id}>
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={post.userAvatar} data-ai-hint="user avatar"/>
                                        <AvatarFallback>{post.userName ? getInitials(post.userName) : 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-base font-bold">{post.userName}</CardTitle>
                                        <CardDescription>
                                            {post.timestamp ? formatDistanceToNow(new Date(post.timestamp), { addSuffix: true }) : (isHindi ? 'अभी-अभी' : 'Just now')}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap">{post.content}</p>
                                {post.imageUrl && (
                                    <div className="mt-4 rounded-lg overflow-hidden border">
                                        <Image src={post.imageUrl} alt="Community post image" width={800} height={600} className="object-cover w-full h-auto" data-ai-hint="community post"/>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex justify-between items-center border-t pt-4">
                                <Button variant="ghost" onClick={() => handleLike(post.id)} className={(firebaseUser && post.likedBy && post.likedBy.includes(firebaseUser.uid)) ? 'text-primary' : ''}>
                                    <ThumbsUp className="mr-2 h-4 w-4" /> {post.likesCount}
                                </Button>
                                <Button variant="ghost" onClick={() => router.push(`/community/${post.id}`)}>
                                    <MessageSquare className="mr-2 h-4 w-4" /> {post.commentsCount} {isHindi ? 'टिप्पणियाँ' : 'Comments'}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </AppLayout>
    );
}
