
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons/Logo';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

declare global {
    interface Window {
        recaptchaVerifier: RecaptchaVerifier;
        confirmationResult: ConfirmationResult;
    }
}


export default function LoginPage() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': (response: any) => {
                // reCAPTCHA solved, allow signInWithPhoneNumber.
            }
        });
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
        toast({
            title: "Invalid Phone Number",
            description: "Please enter a valid 10-digit phone number.",
            variant: "destructive",
        });
      return;
    }
    setIsLoading(true);
    setupRecaptcha();
    const appVerifier = window.recaptchaVerifier;
    const phoneNumber = `+91${phone}`;

    try {
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        window.confirmationResult = confirmationResult;
        setStep(2);
        toast({
            title: "OTP Sent",
            description: "An OTP has been sent to your phone.",
        });
    } catch(error) {
        console.error(error);
        toast({
            title: "Failed to send OTP",
            description: "Please try again later.",
            variant: "destructive"
        })
    } finally {
        setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
        toast({
            title: "Invalid OTP",
            description: "OTP must be 6 digits.",
            variant: "destructive",
        });
        return;
    }
    setIsLoading(true);
    try {
        const confirmationResult = await window.confirmationResult.confirm(otp)
        const fUser = confirmationResult.user;

        // As we don't have user profile creation flow post-signup,
        // we'll log them in with a default profile.
        // In a real app, you might redirect to a profile setup page.
        await login(fUser, { name: 'New Farmer', location: '', language: 'en', avatarUrl: `https://placehold.co/100x100.png` });
        
        router.push('/my-farms');
        toast({
            title: "Login Successful",
            description: "Welcome to Krish-AI!",
        })
    } catch(error) {
        console.error("Error verifying OTP", error);
        toast({
            title: "Invalid OTP",
            description: "The OTP you entered is incorrect.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center gap-3">
            <Logo className="h-12 w-12 text-primary" />
            <h1 className="font-headline text-4xl font-bold text-primary">Krish-AI</h1>
          </div>
          <CardTitle className="text-2xl font-semibold text-foreground">
            {step === 1 ? 'Welcome!' : 'Enter OTP'}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? 'Enter your phone number to sign in.'
              : `We've sent an OTP to +91 ${phone}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
        <div id="recaptcha-container"></div>
          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex items-center">
                    <span className="rounded-l-md border border-r-0 border-input bg-muted px-3 py-2 text-sm text-muted-foreground">+91</span>
                    <Input
                        id="phone"
                        type="tel"
                        placeholder="000-000-0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        required
                        className="rounded-l-none"
                    />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp">One-Time Password</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  maxLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verify & Login
              </Button>
              <Button variant="link" size="sm" onClick={() => setStep(1)} className="w-full">
                Use a different number
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
