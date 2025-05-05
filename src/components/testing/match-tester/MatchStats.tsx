
import { useAuth } from "@/hooks/useAuth";

interface MatchStatsProps {
  requestsCount: number;
  preferredDatesCount: number;
  userRequestsCount: number;
  matchesCount: number;
}

export function MatchStats({ requestsCount, preferredDatesCount, userRequestsCount, matchesCount }: MatchStatsProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <div>
        <span className="font-semibold">Requests:</span> {requestsCount}
      </div>
      <div>
        <span className="font-semibold">Preferred Dates:</span> {preferredDatesCount}
      </div>
      <div>
        <span className="font-semibold">Your Requests:</span> {userRequestsCount}
      </div>
      <div>
        <span className="font-semibold">Matches Found:</span> {matchesCount}
      </div>
    </div>
  );
}
