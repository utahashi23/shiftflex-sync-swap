
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/layouts/AppLayout";

const FAQ = () => {
  const faqItems = [
    {
      question: "How do shift swaps work?",
      answer: "Shift swaps allow you to request changes to your scheduled shifts. First, select a shift you want to swap on the calendar tab. Then, choose dates you'd prefer to work instead. Once submitted, the system will attempt to match you with colleagues who want the opposite swap. When a match is found, both parties need to accept the swap before it's finalized by an administrator."
    },
    {
      question: "How do I request a shift swap?",
      answer: "Navigate to the Shift Swaps page and select the Calendar tab. Click on a shift you want to swap, then use the panel on the right to select dates you'd prefer to work instead. You can choose multiple preferred dates to increase your chances of finding a match."
    },
    {
      question: "What happens after I request a swap?",
      answer: "Your request will be visible in the 'Requested Swaps' tab. The system will automatically look for potential matches among other colleagues' requests. When a match is found, both parties will be notified and the match will appear in the 'Matched Swaps' tab."
    },
    {
      question: "How long does a swap match remain valid?",
      answer: "There is no automatic expiration for swap matches. Requests remain active until they are either accepted, rejected, or manually deleted by the user or an administrator."
    },
    {
      question: "Who needs to approve a shift swap?",
      answer: "Both parties involved in the swap must accept it, and then an administrator must finalize the swap. Once finalized, the shifts are officially swapped in the system."
    },
    {
      question: "Can I cancel a swap request?",
      answer: "Yes, you can cancel any pending swap request from the 'Requested Swaps' tab by clicking the delete button on your request."
    },
    {
      question: "How do I know if my swap has been matched?",
      answer: "You'll receive a notification when a match is found, and the match will appear in your 'Matched Swaps' tab. You can review and accept the match from there."
    },
    {
      question: "What information do I need to provide in my profile?",
      answer: "Your profile should include your first name, last name, and employee service number. This information helps identify you in the system and is used for shift assignments and communications."
    },
    {
      question: "Can I swap shifts with specific colleagues?",
      answer: "The current system doesn't support direct peer-to-peer swap requests. Instead, it uses an algorithm to find compatible matches based on everyone's preferences."
    },
    {
      question: "What do the different shift types mean?",
      answer: "The system supports three shift types: day shifts, afternoon shifts, and night shifts. When requesting a swap, you can specify which types of shifts you're willing to accept on your preferred dates."
    }
  ];

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h1>
        <p className="text-gray-500 mt-1">
          Common questions about using ShiftFlex
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ShiftFlex FAQ</CardTitle>
          <CardDescription>Find answers to common questions about using the application</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-gray-600">{item.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default FAQ;
