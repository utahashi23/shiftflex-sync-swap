
import React from 'react';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { CalendarIcon, SearchIcon, BellIcon, FilterIcon, RocketIcon, SparkleIcon } from 'lucide-react';

// Feature type definition with progress percentage for slider
type Feature = {
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number; // 0-100
  expectedRelease: string;
  category: string;
};

// New roadmap data with the requested features
const roadmapFeatures: Feature[] = [
  {
    title: 'Calendar Integration',
    description: 'Seamlessly sync your ShiftFlex schedule with popular calendar apps like Google Calendar, Outlook, and Apple Calendar.',
    icon: <CalendarIcon className="h-6 w-6" />,
    progress: 85,
    expectedRelease: 'Q2 2025',
    category: 'Integration',
  },
  {
    title: 'Search Requests',
    description: 'Powerful search capabilities to quickly find specific shifts, colleagues, or locations across your entire schedule history.',
    icon: <SearchIcon className="h-6 w-6" />,
    progress: 60,
    expectedRelease: 'Q3 2025',
    category: 'Utility',
  },
  {
    title: 'SMS/Email Notifications',
    description: 'Stay informed with timely alerts about schedule changes, shift swap requests, and upcoming shifts via SMS or email.',
    icon: <BellIcon className="h-6 w-6" />,
    progress: 45,
    expectedRelease: 'Q3 2025',
    category: 'Communication',
  },
  {
    title: 'Custom Filters',
    description: 'Create personalized filters to view exactly what matters to you - filter by location, shift time, colleagues, and more.',
    icon: <FilterIcon className="h-6 w-6" />,
    progress: 30,
    expectedRelease: 'Q4 2025',
    category: 'Customization',
  },
];

// Release progress component with slider
const ReleaseProgress = ({ progress, expectedRelease }: { progress: number, expectedRelease: string }) => {
  return (
    <div className="mt-4 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Development progress</span>
        <span className="text-sm font-medium text-primary">{progress}%</span>
      </div>
      <Slider
        defaultValue={[progress]}
        max={100}
        step={1}
        disabled
        className="cursor-default"
      />
      <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-2">
        <CalendarIcon className="h-3.5 w-3.5" />
        <span>Expected release: {expectedRelease}</span>
      </div>
    </div>
  );
};

const Roadmap = () => {
  useAuthRedirect({ protectedRoute: true });
  
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <RocketIcon className="h-8 w-8 text-primary" />
          Product Roadmap
        </h1>
        <p className="text-gray-500 mt-1">
          Explore the exciting features coming soon to ShiftFlex
        </p>
      </div>
      
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <SparkleIcon className="h-5 w-5 text-primary" />
            Upcoming Features
          </h2>
          <p className="text-gray-600">
            We're continuously improving ShiftFlex with new features to enhance your shift management experience.
            Track our progress below!
          </p>
        </div>
        
        <Separator className="my-6" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roadmapFeatures.map((feature, index) => (
            <div 
              key={index}
              className="border rounded-lg p-5 hover:shadow-md transition-shadow bg-white animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-medium">{feature.title}</h3>
              </div>
              
              <p className="text-gray-600 mt-3 mb-4">{feature.description}</p>
              
              <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100 mb-4">
                {feature.category}
              </Badge>
              
              <ReleaseProgress 
                progress={feature.progress} 
                expectedRelease={feature.expectedRelease} 
              />
            </div>
          ))}
        </div>
        
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-dashed border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <RocketIcon className="h-5 w-5 text-blue-500" />
            <h3 className="font-medium text-blue-700">Have a feature request?</h3>
          </div>
          <p className="text-gray-600">
            We value your input! If you have ideas for new features or improvements, 
            please share them with our team through the feedback form in the Settings page.
          </p>
        </div>
      </Card>
    </AppLayout>
  );
};

export default Roadmap;
