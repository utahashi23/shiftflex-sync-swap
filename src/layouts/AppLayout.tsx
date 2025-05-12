import React, { ReactNode } from 'react';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { Sidebar } from '@/components/Sidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { Navigation } from '@/components/Navigation';
import { EmailDomainWarning } from '@/components/EmailDomainWarning';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: { children: ReactNode }) => {
  useAuthRedirect({ protectedRoute: true });
  
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <MobileSidebar />
      
      <div className="flex-grow p-6 md:p-8 overflow-y-auto">
        <EmailDomainWarning />
        {children}
      </div>
      
      <Navigation />
    </div>
  );
};

export default AppLayout;
