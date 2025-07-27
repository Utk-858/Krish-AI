
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, LogOut, Settings, Tractor, User, LifeBuoy, ClipboardList, HeartPulse, TrendingUp, Bell, Users, FlaskConical, Calendar, Banknote } from 'lucide-react';
import { Logo } from './icons/Logo';
import UniversalMic from './UniversalMic';
import { AgriBotBubble } from './AgriBotBubble';
import { cn } from '@/lib/utils';
import { LanguageSelector } from './LanguageSelector';


function AppLayoutHeader() {
  const { state } = useSidebar();
  return (
    <div className="flex items-center gap-2">
      <Logo className="size-8 text-foreground" />
      <span
        className={cn(
          "text-xl font-semibold text-foreground transition-all duration-300 ease-in-out",
          state === 'collapsed' ? 'opacity-0 -translate-x-4 w-0' : 'opacity-100 translate-x-0 w-auto'
        )}
      >
        Krish-AI
      </span>
    </div>
  )
}

const navItems = [
    { href: '/my-farms', icon: <Tractor/>, label: 'My Farms', labelHi: 'मेरे खेत', startsWith: '/my-farms' },
    { href: '/crop-planner', icon: <ClipboardList/>, label: 'Crop Planner', labelHi: 'फसल योजनाकार', startsWith: '/crop-planner' },
    { href: '/disease-diagnosis', icon: <HeartPulse/>, label: 'Disease Diagnosis', labelHi: 'रोग निदान', startsWith: '/disease-diagnosis' },
    { href: '/market-insights', icon: <TrendingUp/>, label: 'Market Insights', labelHi: 'बाजार जानकारी', startsWith: '/market-insights' },
    { href: '/schemes', icon: <Banknote/>, label: 'Govt. Schemes', labelHi: 'सरकारी योजनाएं', startsWith: '/schemes' },
    { href: '/community', icon: <Users/>, label: 'Community', labelHi: 'समुदाय', startsWith: '/community' },
    { href: '/notifications', icon: <Bell/>, label: 'Notifications', labelHi: 'सूचनाएं', startsWith: '/notifications' },
    { href: '/profile-setup', icon: <Settings/>, label: 'Profile Setup', labelHi: 'प्रोफ़ाइल सेटअप', startsWith: '/profile-setup' },
];

export default function AppLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router, isClient]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  const isHindi = user?.language === 'hi';

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="floating">
        <SidebarRail />
        <SidebarHeader>
          <AppLayoutHeader />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map(item => (
                <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.startsWith)}
                    tooltip={isHindi ? item.labelHi : item.label}
                >
                    <Link href={item.href}>
                    {item.icon}
                    <span>{isHindi ? item.labelHi : item.label}</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <SidebarMenu>
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Storage Test" isActive={pathname === '/storage-test'}>
                        <Link href="/storage-test">
                            <FlaskConical />
                            <span>Storage Test</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={isHindi ? "सहायता" : "Help"}>
                        <Link href="#">
                            <LifeBuoy />
                            <span>{isHindi ? "सहायता" : "Help"}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-4">
             <SidebarTrigger />
             <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <UniversalMic />
            <LanguageSelector />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatarUrl || ''} alt={user?.name || ''} data-ai-hint="profile avatar" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.name ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                    </Avatar>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                        {user?.location}
                    </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push('/profile-setup')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>{isHindi ? "प्रोफ़ाइल" : "Profile"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isHindi ? "लॉग आउट" : "Log out"}</span>
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 bg-muted/40">{children}</main>
        <AgriBotBubble />
      </SidebarInset>
    </SidebarProvider>
  );
}
