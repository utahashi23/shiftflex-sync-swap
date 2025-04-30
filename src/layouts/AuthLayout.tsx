
import { ReactNode } from 'react';
import { Card, CardContent } from "@/components/ui/card";

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
};

const AuthLayout = ({ children, title }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-secondary to-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary">ShiftFlex</h1>
          <p className="text-gray-500 mt-1">Simplified Shift Swapping</p>
        </div>
        
        <Card className="shadow-lg card-gradient border-secondary">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-semibold text-center mb-6">{title}</h2>
            {children}
          </CardContent>
        </Card>
        
        <div className="text-center mt-6 text-sm text-gray-500">
          &copy; {new Date().getFullYear()} ShiftFlex. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
