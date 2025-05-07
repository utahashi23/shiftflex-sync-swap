
import React from 'react';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RocketIcon, CalendarIcon, ClockIcon, SparkleIcon } from 'lucide-react';

// Feature type definition
type Feature = {
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  timeline: string;
  status: 'planned' | 'in-progress' | 'completed';
};

// Updated roadmap data with removed features and more engaging descriptions
const roadmapFeatures: Feature[] = [
  {
    title: 'Team Chat Integration',
    description: 'Connect with your team seamlessly! Our in-app messaging system will allow instant coordination for shift changes and important updates.',
    category: 'Communication',
    priority: 'medium',
    timeline: 'Q3 2025',
    status: 'in-progress',
  },
  {
    title: 'Staff Availability Calendar',
    description: 'Take control of your schedule! This feature lets staff indicate their preferred working hours for more balanced and fair shift assignments.',
    category: 'Scheduling',
    priority: 'high',
    timeline: 'Q2 2025',
    status: 'in-progress',
  },
  {
    title: 'Calendar Integrations',
    description: 'Never miss a shift again! Sync your ShiftFlex schedule directly with Google Calendar, Outlook, and other popular calendar apps.',
    category: 'Integration',
    priority: 'low',
    timeline: 'Q3 2025',
    status: 'planned',
  },
  {
    title: 'Shift Pattern Analytics',
    description: 'Unlock powerful insights about your team\'s scheduling patterns and identify opportunities to optimize coverage and efficiency.',
    category: 'Analytics',
    priority: 'medium',
    timeline: 'Q4 2025',
    status: 'planned',
  },
];

// Helper function for rendering priority badges
const PriorityBadge = ({ priority }: { priority: Feature['priority'] }) => {
  const colors = {
    high: 'bg-red-100 text-red-800 hover:bg-red-100',
    medium: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
    low: 'bg-green-100 text-green-800 hover:bg-green-100',
  };
  
  return (
    <Badge variant="outline" className={colors[priority]}>
      {priority}
    </Badge>
  );
};

// Helper function for rendering status badges
const StatusBadge = ({ status }: { status: Feature['status'] }) => {
  const statusConfig = {
    'planned': { class: 'bg-blue-100 text-blue-800 hover:bg-blue-100', label: 'Planned' },
    'in-progress': { class: 'bg-purple-100 text-purple-800 hover:bg-purple-100', label: 'In Progress' },
    'completed': { class: 'bg-green-100 text-green-800 hover:bg-green-100', label: 'Completed' },
  };
  
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={config.class}>
      {config.label}
    </Badge>
  );
};

// Timeline indicator component to make the roadmap more engaging
const TimelineIndicator = ({ timeline }: { timeline: string }) => {
  return (
    <div className="flex items-center gap-2 text-sm bg-primary/5 px-3 py-1 rounded-full">
      <CalendarIcon className="h-4 w-4 text-primary" />
      <span className="font-medium">Expected: {timeline}</span>
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
          Explore upcoming features and planned improvements for ShiftFlex
        </p>
      </div>
      
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <SparkleIcon className="h-5 w-5 text-primary" />
            Our Vision for the Future
          </h2>
          <p className="text-gray-600">
            We're continuously working to improve ShiftFlex and add exciting new features 
            that make shift management easier and more efficient. Check out our upcoming releases below!
          </p>
        </div>
        
        <Separator className="my-6" />
        
        <div className="space-y-8">
          {roadmapFeatures.map((feature, index) => (
            <div key={index} className="border rounded-lg p-5 hover:shadow-md transition-shadow bg-white">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium">{feature.title}</h3>
                <div className="flex gap-2">
                  <PriorityBadge priority={feature.priority} />
                  <StatusBadge status={feature.status} />
                </div>
              </div>
              
              <p className="text-gray-600 mb-4">{feature.description}</p>
              
              <div className="flex justify-between items-center">
                <span className="bg-gray-100 px-2 py-1 rounded text-sm">{feature.category}</span>
                <TimelineIndicator timeline={feature.timeline} />
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-dashed border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <ClockIcon className="h-5 w-5 text-blue-500" />
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
