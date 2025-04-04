
import React from 'react';
import { TimerProvider } from '@/context/TimerContext';
import Timer from '@/components/Timer';
import DailyReport from '@/components/DailyReport';

const Index = () => {
  return (
    <TimerProvider>
      <div className="min-h-screen max-w-lg mx-auto px-4 py-8 flex flex-col">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-center">TapTrack</h1>
          <p className="text-center text-muted-foreground">Track your productive time</p>
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
    </TimerProvider>
  );
};

export default Index;
