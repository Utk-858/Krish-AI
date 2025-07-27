'use client';

import { Mic } from 'lucide-react';
import { Button } from './ui/button';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { processVoiceInput } from '@/ai/flows/process-voice-input';

interface VoiceInputProps {
  value: string;
  onValueChange: (value: string) => void;
  fieldName: string;
  children: React.ReactNode;
}

export function VoiceInput({ value, onValueChange, fieldName, children }: VoiceInputProps) {
  const { isListening, transcript, startListening, error, isSupported } = useSpeechRecognition();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast({
        title: 'Voice Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  useEffect(() => {
    const processTranscript = async () => {
      if (transcript) {
        setIsProcessing(true);
        try {
          const result = await processVoiceInput({ voiceInput: transcript, fieldToPopulate: fieldName });
          if (result.processedValue) {
            onValueChange(result.processedValue);
            toast({
              title: `Field Updated: ${fieldName}`,
              description: `Set to "${result.processedValue}"`,
            });
          } else {
            toast({
                title: 'Could not extract value',
                description: `No relevant information for "${fieldName}" found in your speech.`,
                variant: 'destructive',
            })
          }
        } catch (e) {
          toast({
            title: 'AI Processing Error',
            description: 'Could not process the voice input.',
            variant: 'destructive',
          });
        } finally {
            setIsProcessing(false);
        }
      }
    };
    processTranscript();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  if (!isSupported) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full">
      {children}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full ${
          isListening || isProcessing ? 'text-accent' : 'text-muted-foreground'
        }`}
        onClick={startListening}
        disabled={isListening || isProcessing}
        aria-label={`Voice input for ${fieldName}`}
      >
        <Mic className={`h-5 w-5 ${isListening || isProcessing ? 'animate-pulse' : ''}`} />
      </Button>
    </div>
  );
}
