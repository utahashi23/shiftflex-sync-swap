
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/auth'; // Import from the correct barrel file
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Truck, Shuffle, Settings, HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  
  console.log('Index page loading state:', isLoading, 'User:', user?.id);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        console.log('Loading timed out, forcing state update');
        setLoadingTimedOut(true);
      }
    }, 5000); // 5 seconds timeout
    
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    // Only redirect if not loading and we have a user
    if ((!isLoading || loadingTimedOut) && user) {
      console.log('User authenticated, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [user, isLoading, loadingTimedOut, navigate]);

  const features = [
    {
      title: "Roster",
      description: "View and manage your upcoming shifts in a convenient roster view",
      icon: <Calendar className="h-8 w-8 text-primary" />,
      path: "/roster"
    },
    {
      title: "Shift Swaps",
      description: "Request and accept shift swaps with your colleagues",
      icon: <Shuffle className="h-8 w-8 text-primary" />,
      path: "/shifts"
    },
    {
      title: "Truck Assignment",
      description: "See which truck you're assigned to for each shift",
      icon: <Truck className="h-8 w-8 text-primary" />,
      path: "/roster"
    },
    {
      title: "FAQ",
      description: "Find answers to common questions about using ShiftFlex",
      icon: <HelpCircle className="h-8 w-8 text-primary" />,
      path: "/faq"
    }
  ];

  // Show simplified loading screen to debug the issue, but allow bypass if loading takes too long
  if (isLoading && !loadingTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full animate-pulse bg-primary"></div>
          </div>
          <h1 className="text-2xl font-bold mb-4 text-gray-700">Loading ShiftFlex...</h1>
          <p className="text-sm text-gray-500 mb-4">Checking authentication status...</p>
          <Button 
            variant="outline" 
            onClick={() => setLoadingTimedOut(true)}
            className="mt-2"
          >
            Continue to site
          </Button>
        </div>
      </div>
    );
  }

  // If the user is not logged in, show the landing page
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            ShiftFlex
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Simplify shift management for emergency services personnel
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/register">Register</Link>
            </Button>
          </div>
        </header>

        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-center mb-10">Key Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="p-2 bg-primary/10 rounded-md w-fit mb-2">{feature.icon}</div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 text-base">{feature.description}</CardDescription>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="ghost" size="sm" className="mt-2" asChild>
                    <Link to="/register">Learn More</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-6">Ready to simplify your shifts?</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Join ShiftFlex today and experience a better way to manage your work schedule.
          </p>
          <Button size="lg" className="animate-pulse" asChild>
            <Link to="/register">Get Started</Link>
          </Button>
        </section>
      </div>

      <footer className="bg-gray-800 text-white py-8 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p>© 2025 ShiftFlex. All rights reserved.</p>
          <p className="text-gray-400 text-sm mt-2">Developed for emergency services personnel</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
