
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Loader2, Send, User, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { askAgriBot } from '@/ai/flows/agri-bot';
import { VoiceInput } from '@/components/VoiceInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type Message = {
    role: 'user' | 'model';
    content: string;
};

export function AgriBotBubble() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const chatHistory = messages;
            const result = await askAgriBot({ query: input, chatHistory });
            const modelMessage: Message = { role: 'model', content: result.response };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Error asking AgriBot:", error);
            toast({
                title: 'AI Error',
                description: 'Failed to get a response from AgriBot.',
                variant: 'destructive',
            });
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button 
                  size="icon"
                  className={cn(
                    "fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full shadow-2xl transition-all duration-300 ease-in-out",
                    isOpen ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
                  )}
                  aria-label="Toggle AgriBot"
                >
                    {isOpen ? <X className="h-8 w-8" /> : <Bot className="h-8 w-8" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 h-[28rem] mr-4 mb-2 p-0 flex flex-col" side="top" align="end">
                 <Card className="flex-grow flex flex-col h-full border-0">
                    <CardHeader className='pb-4'>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Bot />
                            AgriBot Assistant
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col p-4 pt-0">
                        <ScrollArea className="flex-grow pr-4 -mr-4" ref={scrollAreaRef}>
                            <div className="space-y-4">
                                {messages.length === 0 && (
                                    <div className="text-center text-muted-foreground pt-10">
                                        <p>Hello! I'm AgriBot.</p>
                                        <p className="text-xs">Ask me anything about farming!</p>
                                    </div>
                                )}
                                {messages.map((message, index) => (
                                    <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                                        {message.role === 'model' && <Bot className="h-6 w-6 text-primary flex-shrink-0" />}
                                        <div className={`p-3 rounded-lg max-w-lg text-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                            <p className="whitespace-pre-wrap">{message.content}</p>
                                        </div>
                                        {message.role === 'user' && <User className="h-6 w-6 flex-shrink-0" />}
                                    </div>
                                ))}
                                {isLoading && (
                                     <div className="flex items-start gap-3">
                                        <Bot className="h-6 w-6 text-primary flex-shrink-0" />
                                        <div className="p-3 rounded-lg bg-muted">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                        <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
                           <VoiceInput value={input} onValueChange={setInput} fieldName="Chatbot Query">
                             <Input
                                id="chat-input"
                                placeholder="Ask a question..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isLoading}
                                autoComplete="off"
                            />
                           </VoiceInput>
                            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                                <Send className="h-4 w-4" />
                                <span className="sr-only">Send</span>
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </PopoverContent>
        </Popover>
    );
}
