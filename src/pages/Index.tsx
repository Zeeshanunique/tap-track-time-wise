
import React from 'react';
import Timer from '@/components/Timer';
import DailyReport from '@/components/DailyReport';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-8 flex flex-col">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-center">TapTrack</h1>
          <p className="text-center text-muted-foreground">Track your productive time</p>
        </div>
        <Link to="/dashboard">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
      </header>

      <div className="flex-1 flex flex-col gap-10">
        <div className="flex-grow flex items-center justify-center">
          <Timer />
        </div>
        
        <div className="mt-auto">
          <DailyReport />
        </div>
      </div>
    </div>
  );
};

export default Index;
