
import React from 'react';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AppLayout from '@/layouts/AppLayout';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { QuestionIcon, Calendar, RocketIcon, HelpCircle, UsersIcon, CalendarIcon, MessageCircleQuestion, ShieldQuestion } from 'lucide-react';

// Define FAQ type
type FAQItem = {
  question: string;
  answer: React.ReactNode;
  category: string;
  icon: React.ReactNode;
};

const faqItems: FAQItem[] = [
  {
    question: "How do I request a shift swap?",
    answer: (
      <div>
        <p>To request a shift swap:</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>Navigate to the "Shift Swaps" page from the sidebar</li>
          <li>Click on "Create New Swap Request"</li>
          <li>Select the shift you want to swap</li>
          <li>Choose your preferred dates</li>
          <li>Submit your request</li>
        </ol>
        <p className="mt-2">After submission, your request will be visible to other colleagues who may be interested in swapping.</p>
      </div>
    ),
    category: "Shift Swaps",
    icon: <Calendar className="h-5 w-5 text-primary" />
  },
  {
    question: "How are shift swap matches determined?",
    answer: (
      <div>
        <p>Shift swap matches are determined through our matching algorithm that looks for compatible requests between colleagues.</p>
        <p className="mt-2">A match occurs when:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>You want another colleague's shift date</li>
          <li>They want your shift date</li>
          <li>Both shifts are eligible for swapping</li>
        </ul>
        <p className="mt-2">When a match is found, both parties receive a notification and can confirm the swap.</p>
      </div>
    ),
    category: "Shift Swaps",
    icon: <UsersIcon className="h-5 w-5 text-primary" />
  },
  {
    question: "Where can I see my upcoming shifts?",
    answer: (
      <div>
        <p>You can view your upcoming shifts in several places:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Dashboard</strong> - Shows your next shifts at a glance</li>
          <li><strong>Roster</strong> - Provides a calendar view of all your scheduled shifts</li>
        </ul>
        <p className="mt-2">The Roster page also allows you to filter and view shifts by date, type, or location.</p>
      </div>
    ),
    category: "Roster",
    icon: <CalendarIcon className="h-5 w-5 text-primary" />
  },
  {
    question: "What upcoming features are planned for ShiftFlex?",
    answer: (
      <p>
        You can see all planned features and their expected release dates on our Roadmap page. 
        Currently, we're working on features like Calendar Integration, Search functionality, 
        SMS/Email notifications, and Custom Filters to improve your shift management experience.
      </p>
    ),
    category: "General",
    icon: <RocketIcon className="h-5 w-5 text-primary" />
  },
  {
    question: "How do I update my profile information?",
    answer: (
      <div>
        <p>To update your profile information:</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>Click on "Settings" in the sidebar menu</li>
          <li>Navigate to the "Profile" section</li>
          <li>Update your details as needed</li>
          <li>Click "Save Changes"</li>
        </ol>
      </div>
    ),
    category: "Account",
    icon: <ShieldQuestion className="h-5 w-5 text-primary" />
  },
  {
    question: "What should I do if my shift swap request has no matches?",
    answer: (
      <div>
        <p>If your shift swap request isn't getting matches:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Consider expanding your preferred dates to increase chances of matching</li>
          <li>Check if you've selected dates that align with colleagues' shifts</li>
          <li>You can delete and recreate your request with different preferences</li>
        </ul>
        <p className="mt-2">Remember, matches depend on other colleagues wanting your shift date as well.</p>
      </div>
    ),
    category: "Shift Swaps",
    icon: <MessageCircleQuestion className="h-5 w-5 text-primary" />
  }
];

// Group FAQs by category
const groupedFAQs = faqItems.reduce<Record<string, FAQItem[]>>((acc, item) => {
  if (!acc[item.category]) {
    acc[item.category] = [];
  }
  acc[item.category].push(item);
  return acc;
}, {});

const FAQ = () => {
  useAuthRedirect({ protectedRoute: true });

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <HelpCircle className="h-8 w-8 text-primary" />
          Frequently Asked Questions
        </h1>
        <p className="text-gray-500 mt-1">
          Find answers to common questions about using ShiftFlex
        </p>
      </div>

      <div className="grid gap-6">
        {Object.entries(groupedFAQs).map(([category, items], index) => (
          <Card key={category} className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              {items[0].icon}
              {category}
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {items.map((item, i) => (
                <AccordionItem key={i} value={`item-${index}-${i}`}>
                  <AccordionTrigger className="text-left font-medium">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2 pb-1 text-gray-700">
                      {item.answer}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        ))}

        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex flex-col items-center text-center">
            <HelpCircle className="h-10 w-10 text-blue-500 mb-3" />
            <h2 className="text-lg font-medium text-blue-700 mb-2">Can't find what you're looking for?</h2>
            <p className="text-gray-600 mb-4">
              If you have more questions or need additional support, please reach out to your administrator or use the feedback form in Settings.
            </p>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default FAQ;
