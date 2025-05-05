
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMatchTesterData } from './match-tester/useMatchTesterData';
import { useMatchTesterAlgorithm } from './match-tester/useMatchTesterAlgorithm';
import { useCreateMatch } from './match-tester/useCreateMatch';
import { MatchStats } from './match-tester/MatchStats';
import { MatchResults } from './match-tester/MatchResults';

interface SimpleMatchTesterProps {
  onMatchCreated?: () => void;
}

const SimpleMatchTester = ({ onMatchCreated }: SimpleMatchTesterProps) => {
  const { user } = useAuth();
  const { isLoading, allRequests, allPreferredDates, fetchData } = useMatchTesterData(user);
  const { matchResults, runSimpleMatch } = useMatchTesterAlgorithm(user);
  const { createMatch, isCreating } = useCreateMatch(onMatchCreated, fetchData);

  // Run the test match algorithm
  const handleRunMatch = () => {
    runSimpleMatch(allRequests, allPreferredDates);
  };

  const userRequestsCount = user ? allRequests.filter(req => req.requester_id === user.id).length : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center justify-between">
          Swap Match Testing
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleRunMatch}
              disabled={isLoading || !allRequests.length}
            >
              Run Test Match
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-3">
          <MatchStats 
            requestsCount={allRequests.length}
            preferredDatesCount={allPreferredDates.length}
            userRequestsCount={userRequestsCount}
            matchesCount={matchResults.length}
          />
          
          <MatchResults 
            matchResults={matchResults}
            isCreating={isCreating}
            onCreateMatch={createMatch}
            isLoading={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleMatchTester;
