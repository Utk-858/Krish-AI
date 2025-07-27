'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';

export function LanguageSelector() {
  const { user, updateProfile } = useAuth();

  const handleLanguageChange = (lang: string) => {
    if (user) {
      updateProfile({ language: lang });
    }
  };

  return (
     <Select onValueChange={handleLanguageChange} value={user?.language || 'en'}>
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="hi">हिंदी</SelectItem>
      </SelectContent>
    </Select>
  );
}
