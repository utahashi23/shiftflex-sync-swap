
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { HelpCircle, Clock, CalendarCheck, RefreshCw, CheckCircle } from 'lucide-react';

export function SwapMatchInfoPanel() {
  return (
    <div className="border border-amber-300 rounded-lg bg-amber-50 p-4 mb-4">
      <h2 className="text-lg font-bold text-amber-700 mb-2 flex items-center gap-2">
        <HelpCircle className="h-5 w-5" />
        How Swap Matching Works
      </h2>
      <div className="text-sm text-amber-700 space-y-3">
        <p>
          Swap matches are created automatically when your swap request matches with another employee's request.
          Click the "Refresh Matches" button to check for new potential matches.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Card className="bg-white border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 font-medium mb-2">
                <RefreshCw className="h-4 w-4 text-amber-600" />
                <span>Step 1: Find Matches</span>
              </div>
              <p className="text-sm text-gray-600">
                The system looks for other employees who want your shift date and whose shifts match your preferences.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 font-medium mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Step 2: Accept Match</span>
              </div>
              <p className="text-sm text-gray-600">
                When a match is found, review and accept it if you want to swap with that person.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 font-medium mb-2">
                <CalendarCheck className="h-4 w-4 text-blue-600" />
                <span>Step 3: Swap Complete</span>
              </div>
              <p className="text-sm text-gray-600">
                Once accepted, the swap is processed and your schedule is updated automatically.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="outline" className="bg-amber-100 text-amber-800">
            <Clock className="h-3 w-3 mr-1" /> Updated automatically
          </Badge>
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Easy to use
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            Manager approved
          </Badge>
        </div>
      </div>
    </div>
  );
}
