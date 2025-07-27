'use client';

import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { analyzeVoiceInputAndRoute } from '@/ai/flows/context-aware-navigation';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function UniversalMic() {
  const { isListening, transcript, startListening, stopListening, error, isSupported } = useSpeechRecognition();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    if (error) {
      toast({
        title: 'Voice Recognition Error',
        description: `An error occurred: ${error}`,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  useEffect(() => {
    const handleNavigation = async () => {
      if (transcript) {
        setIsProcessing(true);
        console.log('MIC: Transcript received:', transcript);
        toast({
          title: 'Processing your command...',
          description: `"${transcript}"`,
        });
        try {
          const result = await analyzeVoiceInputAndRoute({ 
            voiceInput: transcript, 
            currentPath: pathname, 
            language: user?.language || 'en' 
          });
          console.log('MIC: AI navigation result:', result);
          
          if (result.navigationPath && result.navigationPath !== pathname) {
            router.push(result.navigationPath);
            toast({
              title: 'Navigation Success',
              description: `Moving to ${result.navigationPath}`,
            });
          }
        } catch (e) {
          toast({
            title: 'AI Error',
            description: 'Could not process your voice command.',
            variant: 'destructive',
          });
        } finally {
            setIsProcessing(false);
        }
      }
    };

    if (!isListening && transcript) {
      handleNavigation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, isListening]);


  if (!isSupported) {
    return null;
  }

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  const showSpinner = isListening || isProcessing;

  return (
    <Button
      size="icon"
      variant="ghost"
      className={`h-10 w-10 rounded-full transition-all duration-300 ease-in-out ${
        showSpinner ? 'bg-destructive/20 text-destructive' : 'text-foreground'
      }`}
      onClick={handleMicClick}
      aria-label={isListening ? 'Stop listening' : 'Start voice command'}
    >
      {showSpinner ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );
}
