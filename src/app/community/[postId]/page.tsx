
'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ThumbsUp, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, updateDoc, arrayUnion, arrayRemove, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { CommunityPost, CommunityComment } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function PostDetailPage() {
    const [post, setPost] = useState<CommunityPost | null>(null);
    const [comments, setComments] = useState<CommunityComment[]>([]);
    const [isLoadingPost, setIsLoadingPost] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    
    const { user, firebaseUser } = useAuth();
    const params = useParams();
    const postId = params.postId as string;
    const { toast } = useToast();
    const router = useRouter();
    const isHindi = user?.language === 'hi';

    useEffect(() => {
        if (!postId) return;

        const postRef = doc(db, 'communityPosts', postId);
        const unsubscribePost = onSnapshot(postRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                // Firestore server timestamps can be null initially
                const postData = { 
                    id: doc.id, 
                    ...data,
                    timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null
                } as CommunityPost;
                setPost(postData);
            } else {
                toast({ title: isHindi ? "त्रुटि" : "Error", description: isHindi ? "पोस्ट नहीं मिला।" : "Post not found.", variant: "destructive" });
                router.push('/community');
            }
            setIsLoadingPost(false);
        });

        const commentsRef = collection(db, 'communityPosts', postId, 'comments');
        const q = query(commentsRef, orderBy('timestamp', 'asc'));
        const unsubscribeComments = onSnapshot(q, (snapshot) => {
            const commentsData = snapshot.docs.map(doc => {
                 const data = doc.data();
                 return { 
                    id: doc.id, 
                    ...data,
                    timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null
                 } as CommunityComment
            });
            setComments(commentsData);
        });

        return () => {
            unsubscribePost();
            unsubscribeComments();
        };
    }, [postId, router, toast, isHindi]);

    const handlePostLike = async () => {
        if (!firebaseUser || !post) return;
        
        const postRef = doc(db, 'communityPosts', postId);
        const isLiked = post.likedBy.includes(firebaseUser.uid);

        try {
            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) {
                    throw "Post does not exist!";
                }
                const newLikesCount = (postDoc.data().likesCount || 0) + (isLiked ? -1 : 1);
                transaction.update(postRef, {
                    likedBy: isLiked ? arrayRemove(firebaseUser.uid) : arrayUnion(firebaseUser.uid),
                    likesCount: newLikesCount
                });
            });
        } catch (error) {
            console.error("Error liking post: ", error);
            toast({ title: isHindi ? "त्रुटि" : "Error", description: isHindi ? "लाइक अपडेट करने में विफल।" : "Failed to update like.", variant: "destructive" });
        }
    };
    
    const handleAddComment = async () => {
        if (!newComment.trim() || !firebaseUser || !user) return;
        setIsSubmittingComment(true);

        const postRef = doc(db, 'communityPosts', postId);
        const commentsRef = collection(db, 'communityPosts', postId, 'comments');
        
        try {
            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) throw "Post does not exist!";

                const newCommentsCount = (postDoc.data().commentsCount || 0) + 1;
                
                transaction.update(postRef, { commentsCount: newCommentsCount });
                
                await addDoc(commentsRef, {
                    userId: firebaseUser.uid,
                    userName: user.name,
                    userAvatar: user.avatarUrl || `https://placehold.co/100x100.png`,
                    content: newComment,
                    timestamp: serverTimestamp(),
                });
            });
            setNewComment('');
        } catch (error) {
            console.error("Error adding comment: ", error);
            toast({ title: isHindi ? "त्रुटि" : "Error", description: isHindi ? "टिप्पणी जोड़ने में विफल। कृपया पुन: प्रयास करें।" : "Failed to add comment. Please try again.", variant: "destructive" });
        } finally {
            setIsSubmittingComment(false);
        }
    };
    
    const getInitials = (name: string) => (name || '').split(' ').map((n) => n[0]).join('');

    if (isLoadingPost) {
        return <AppLayout title={isHindi ? "लोड हो रहा है..." : "Loading..."}><div className="text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/></div></AppLayout>;
    }

    if (!post) {
        return <AppLayout title={isHindi ? "पोस्ट नहीं मिला" : "Post Not Found"}><div className="text-center"><p>{isHindi ? "यह पोस्ट नहीं मिल सका।" : "This post could not be found."}</p></div></AppLayout>;
    }

    return (
        <AppLayout title={isHindi ? "सामुदायिक पोस्ट" : "Community Post"}>
            <div className="max-w-3xl mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={post.userAvatar} data-ai-hint="user avatar"/>
                                <AvatarFallback>{getInitials(post.userName)}</AvatarFallback>
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
                        <Button variant="ghost" onClick={handlePostLike} className={(firebaseUser && post.likedBy.includes(firebaseUser.uid)) ? 'text-primary' : ''}>
                            <ThumbsUp className="mr-2 h-4 w-4" /> {post.likesCount}
                        </Button>
                        <div className="flex items-center text-muted-foreground">
                            <MessageSquare className="mr-2 h-4 w-4" /> {post.commentsCount} {isHindi ? 'टिप्पणियाँ' : 'Comments'}
                        </div>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{isHindi ? 'टिप्पणियाँ' : 'Comments'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {comments.map(comment => (
                            <div key={comment.id} className="flex items-start gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={comment.userAvatar} data-ai-hint="user avatar"/>
                                    <AvatarFallback className="text-xs">{getInitials(comment.userName)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-grow rounded-lg bg-muted p-3">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-sm">{comment.userName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {comment.timestamp ? formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true }) : (isHindi ? 'अभी-अभी' : 'Just now')}
                                        </p>
                                    </div>
                                    <p className="text-sm mt-1">{comment.content}</p>
                                </div>
                            </div>
                         ))}
                         {comments.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">{isHindi ? 'अभी तक कोई टिप्पणी नहीं। जवाब देने वाले पहले व्यक्ति बनें!' : 'No comments yet. Be the first to reply!'}</p>}
                    </CardContent>
                    <CardFooter>
                        <div className="w-full flex items-start gap-3">
                            <Avatar>
                                <AvatarImage src={user?.avatarUrl || ''} data-ai-hint="user avatar"/>
                                <AvatarFallback>{user?.name ? getInitials(user.name) : 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-grow flex flex-col gap-2">
                                <Textarea 
                                    placeholder={isHindi ? 'एक टिप्पणी लिखें...' : 'Write a comment...'}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    disabled={isSubmittingComment}
                                />
                                <Button onClick={handleAddComment} disabled={isSubmittingComment || !newComment.trim()} className="self-end">
                                    {isSubmittingComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                                    {isHindi ? 'टिप्पणी' : 'Comment'}
                                </Button>
                            </div>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </AppLayout>
    );
}
