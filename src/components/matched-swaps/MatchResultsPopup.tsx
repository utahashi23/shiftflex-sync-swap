
import React from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SwapMatch } from './types';

interface MatchResultsPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: SwapMatch[];
  title?: string;
}

export const MatchResultsPopup = ({
  open,
  onOpenChange,
  matches,
  title = 'Match Results'
}: MatchResultsPopupProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>{title} ({matches.length})</span>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {matches.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
              No matches found to display.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="font-semibold text-sm">Total matches:</div>
                <div>{matches.length}</div>
              </div>

              {matches.map((match, index) => (
                <div key={match.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-bold mb-2 pb-2 border-b">Match #{index + 1} - {match.id}</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="font-semibold">Status:</div>
                    <div>{match.status}</div>
                    
                    <div className="font-semibold mt-2">My Shift:</div>
                    <div></div>
                    
                    <div className="font-semibold pl-2">Date:</div>
                    <div>{match.myShift.date}</div>
                    
                    <div className="font-semibold pl-2">Time:</div>
                    <div>{match.myShift.startTime} - {match.myShift.endTime}</div>
                    
                    <div className="font-semibold pl-2">Location:</div>
                    <div>{match.myShift.truckName || 'Not specified'}</div>
                    
                    <div className="font-semibold pl-2">Type:</div>
                    <div>{match.myShift.type}</div>
                    
                    <div className="font-semibold pl-2">Colleague Type:</div>
                    <div>{match.myShift.colleagueType || 'Not specified'}</div>
                    
                    <div className="font-semibold mt-2">Their Shift:</div>
                    <div></div>
                    
                    <div className="font-semibold pl-2">Date:</div>
                    <div>{match.otherShift.date}</div>
                    
                    <div className="font-semibold pl-2">Time:</div>
                    <div>{match.otherShift.startTime} - {match.otherShift.endTime}</div>
                    
                    <div className="font-semibold pl-2">Location:</div>
                    <div>{match.otherShift.truckName || 'Not specified'}</div>
                    
                    <div className="font-semibold pl-2">Type:</div>
                    <div>{match.otherShift.type}</div>
                    
                    <div className="font-semibold pl-2">Colleague Type:</div>
                    <div>{match.otherShift.colleagueType || 'Not specified'}</div>
                    
                    <div className="font-semibold pl-2">User:</div>
                    <div>{match.otherShift.userName}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
