
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const PromotionPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Show popup after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      // Check if user has opted out of seeing this popup
      const hasOptedOut = localStorage.getItem('hasOptedOutPromotionPopup') === 'true';
      if (!hasOptedOut) {
        setIsOpen(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // If "Don't show again" is checked, remember this preference
    if (dontShowAgain) {
      localStorage.setItem('hasOptedOutPromotionPopup', 'true');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Try ShiftFlex Now</DialogTitle>
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>
        <div className="p-6 pt-0">
          <div className="mb-4 text-center">
            <p className="text-muted-foreground mb-6">Use these demo credentials to explore the app:</p>
            
            <div className="bg-muted p-4 rounded-md mb-4 text-left">
              <p className="mb-1"><strong>Username:</strong> demo1@maildrop.cc</p>
              <p><strong>Password:</strong> SfDemoUser1Pass#</p>
            </div>
            
            <div className="bg-muted p-4 rounded-md text-left">
              <p className="mb-1"><strong>Username:</strong> demo2@maildrop.cc</p>
              <p><strong>Password:</strong> SfDemoUser2Pass#</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mt-6 mb-4">
            <Checkbox 
              id="dontShowAgain" 
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)} 
            />
            <label 
              htmlFor="dontShowAgain" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Don't show again
            </label>
          </div>
          
          <div className="flex justify-center mt-4">
            <Button onClick={handleClose} size="lg">
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
