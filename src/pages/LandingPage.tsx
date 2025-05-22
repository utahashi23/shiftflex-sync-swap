
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LandingPage = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState({
    days: 45,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Calculate countdown
  useEffect(() => {
    // Set end date to 45 days from now
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 45);

    const timer = setInterval(() => {
      const now = new Date();
      const difference = endDate.getTime() - now.getTime();

      if (difference <= 0) {
        clearInterval(timer);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        {/* Logo and brand */}
        <div className="flex items-center justify-center mb-8">
          <div className="h-12 w-12 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold mr-3">
            SF
          </div>
          <span className="text-3xl font-bold text-gray-900">ShiftFlex</span>
        </div>

        <Card className="p-8 shadow-lg border-t-4 border-indigo-600">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-6">
            Exciting Update!
          </h1>
          
          <p className="text-gray-600 text-center mb-8 text-lg">
            Development is going ahead! The final release will feature advanced shift swap matching, 
            including area-based filtering and powerful 3+ way swap capabilities. 
            Stay tuned — we'll let you know as soon as it's live!
          </p>

          {/* Countdown timer */}
          <div className="mb-8">
            <h2 className="text-center text-gray-700 mb-4 font-medium">Coming in:</h2>
            <div className="flex justify-center gap-4">
              <CountdownBox value={countdown.days} label="Days" />
              <CountdownBox value={countdown.hours} label="Hours" />
              <CountdownBox value={countdown.minutes} label="Minutes" />
              <CountdownBox value={countdown.seconds} label="Seconds" />
            </div>
          </div>

          <div className="text-center">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Join the Waitlist
            </Button>
          </div>
        </Card>

        <div className="mt-8 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} ShiftFlex. All rights reserved.
        </div>
      </div>
    </div>
  );
};

// Component for each countdown box
const CountdownBox = ({ value, label }: { value: number, label: string }) => (
  <div className="flex flex-col items-center">
    <div className="bg-white border border-gray-200 rounded-lg p-3 min-w-[70px] text-center shadow-sm">
      <span className="text-2xl sm:text-3xl font-semibold text-indigo-600">{value}</span>
    </div>
    <span className="text-xs mt-2 text-gray-500 font-medium">{label}</span>
  </div>
);

export default LandingPage;
