
import React from 'react';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RocketIcon } from 'lucide-react';

// Feature type definition
type Feature = {
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  timeline: string;
  status: 'planned' | 'in-progress' | 'completed';
};

// Sample roadmap data
const roadmapFeatures: Feature[] = [
  {
    title: 'Advanced Shift Analytics',
    description: 'Detailed metrics and insights about shift patterns, coverage, and efficiency to help optimize staff scheduling.',
    category: 'Analytics',
    priority: 'high',
    timeline: 'Q3 2025',
    status: 'planned',
  },
  {
    title: 'Mobile Application',
    description: 'A dedicated mobile app for iOS and Android providing on-the-go access to all ShiftFlex features.',
    category: 'Platform',
    priority: 'high',
    timeline: 'Q4 2025',
    status: 'planned',
  },
  {
    title: 'AI-Powered Shift Recommendations',
    description: 'Intelligent shift recommendations based on historical data and staff preferences.',
    category: 'Intelligence',
    priority: 'medium',
    timeline: 'Q1 2026',
    status: 'planned',
  },
  {
    title: 'Team Chat Integration',
    description: 'In-app messaging for teams to coordinate shifts and communicate about schedule changes.',
    category: 'Communication',
    priority: 'medium',
    timeline: 'Q3 2025',
    status: 'in-progress',
  },
  {
    title: 'Staff Availability Calendar',
    description: 'Allow staff to mark their availability preferences for more optimized scheduling.',
    category: 'Scheduling',
    priority: 'high',
    timeline: 'Q2 2025',
    status: 'in-progress',
  },
  {
    title: 'Calendar Integrations',
    description: 'Sync shifts with popular calendar applications like Google Calendar and Outlook.',
    category: 'Integration',
    priority: 'low',
    timeline: 'Q3 2025',
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
          <h2 className="text-xl font-semibold mb-2">Our Vision</h2>
          <p className="text-gray-600">
            We're continuously working to improve ShiftFlex and add new features that make shift management 
            easier and more efficient. Here's what we're planning for upcoming releases.
          </p>
        </div>
        
        <Separator className="my-6" />
        
        <div className="space-y-8">
          {roadmapFeatures.map((feature, index) => (
            <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium">{feature.title}</h3>
                <div className="flex gap-2">
                  <PriorityBadge priority={feature.priority} />
                  <StatusBadge status={feature.status} />
                </div>
              </div>
              
              <p className="text-gray-600 mb-4">{feature.description}</p>
              
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span className="bg-gray-100 px-2 py-1 rounded">{feature.category}</span>
                <span>Expected: {feature.timeline}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
          <h3 className="font-medium mb-2">Have a feature request?</h3>
          <p className="text-gray-600 text-sm">
            We value your input! If you have ideas for new features or improvements, 
            please share them with our team through the feedback form in the Settings page.
          </p>
        </div>
      </Card>
    </AppLayout>
  );
};

export default Roadmap;
