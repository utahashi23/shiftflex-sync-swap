
import React, { ReactNode } from 'react';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { EmailDomainWarning } from '@/components/EmailDomainWarning';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MobileNav } from '@/components/MobileNav';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  useAuthRedirect({ protectedRoute: true });
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="p-6 md:p-8 pb-20 md:pb-8">
          <EmailDomainWarning />
          {children}
        </SidebarInset>
        <MobileNav />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
