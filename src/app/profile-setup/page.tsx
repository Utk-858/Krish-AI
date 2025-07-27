
'use client';

import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { Profile } from '@/lib/types';
import { VoiceInput } from '@/components/VoiceInput';
import { useEffect } from 'react';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  location: z.string().min(2, 'Location is required'),
  language: z.string().min(2, 'Please select a language'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileSetupPage() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const isHindi = user?.language === 'hi';

  const {
    control,
    handleSubmit,
    register,
    formState: { errors, isDirty },
    watch,
    setValue,
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      location: '',
      language: 'en',
    },
  });

  useEffect(() => {
    if (user) {
        reset({
            name: user.name || '',
            location: user.location || '',
            language: user.language || 'en',
        });
    }
  }, [user, reset]);

  const watchedValues = watch();

  const onSubmit = (data: ProfileFormData) => {
    updateProfile(data as Profile);
    toast({
      title: isHindi ? 'प्रोफ़ाइल अपडेट की गई' : 'Profile Updated',
      description: isHindi ? 'आपकी जानकारी सफलतापूर्वक सहेज ली गई है।' : 'Your information has been saved successfully.',
    });
    reset(data); // to update the form's initial state and remove dirty flag
  };

  return (
    <AppLayout title={isHindi ? "प्रोफ़ाइल सेटअप" : "Profile Setup"}>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{isHindi ? "आपकी प्रोफ़ाइल" : "Your Profile"}</CardTitle>
            <CardDescription>
              {isHindi ? "अपनी व्यक्तिगत जानकारी और प्राथमिकताएं प्रबंधित करें। यह हमें आपके अनुभव को अनुकूलित करने में मदद करता है।" : "Manage your personal information and preferences. This helps us customize your experience."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">{isHindi ? "पूरा नाम" : "Full Name"}</Label>
                <VoiceInput
                    value={watchedValues.name}
                    onValueChange={(val) => setValue('name', val, { shouldDirty: true })}
                    fieldName={isHindi ? "पूरा नाम" : "Full Name"}
                >
                    <Input id="name" {...register('name')} placeholder={isHindi ? "जैसे रमेश कुमार" : "e.g. Ramesh Kumar"} />
                </VoiceInput>
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{isHindi ? "स्थान" : "Location"}</Label>
                <VoiceInput
                    value={watchedValues.location}
                    onValueChange={(val) => setValue('location', val, { shouldDirty: true })}
                    fieldName={isHindi ? "स्थान" : "Location"}
                >
                    <Input id="location" {...register('location')} placeholder={isHindi ? "जैसे पुणे, महाराष्ट्र" : "e.g. Pune, Maharashtra"} />
                </VoiceInput>
                {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">{isHindi ? "पसंदीदा भाषा" : "Preferred Language"}</Label>
                <Controller
                  name="language"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(value) => {field.onChange(value); setValue('language', value, {shouldDirty: true})}} value={field.value}>
                      <SelectTrigger id="language">
                        <SelectValue placeholder={isHindi ? "एक भाषा चुनें" : "Select a language"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi (हिंदी)</SelectItem>
                        <SelectItem value="mr">Marathi (मराठी)</SelectItem>
                        <SelectItem value="bn">Bengali (বাংলা)</SelectItem>
                        <SelectItem value="te">Telugu (తెలుగు)</SelectItem>
                        <SelectItem value="ta">Tamil (தமிழ்)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.language && <p className="text-sm text-destructive">{errors.language.message}</p>}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={!isDirty}>{isHindi ? "बदलाव सहेजें" : "Save Changes"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
