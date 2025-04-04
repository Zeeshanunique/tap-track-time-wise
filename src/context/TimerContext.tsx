
import React, { createContext, useContext, useState, useEffect } from 'react';

interface TimerSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  duration: number | null; // in seconds
}

interface TimerContextType {
  isRunning: boolean;
  currentSession: TimerSession | null;
  allSessions: TimerSession[];
  startTimer: () => void;
  stopTimer: () => void;
  getDailyTotal: (date: string) => number;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'tap-track-sessions';

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState<TimerSession | null>(null);
  const [allSessions, setAllSessions] = useState<TimerSession[]>([]);

  // Load sessions from localStorage on initial render
  useEffect(() => {
    const savedSessions = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedSessions) {
      const parsedSessions = JSON.parse(savedSessions);
      setAllSessions(parsedSessions);
      
      // Check if there's an active session
      const activeSession = parsedSessions.find((session: TimerSession) => session.endTime === null);
      if (activeSession) {
        setCurrentSession(activeSession);
        setIsRunning(true);
      }
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSessions));
  }, [allSessions]);

  const startTimer = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toISOString();
    
    const newSession: TimerSession = {
      id: crypto.randomUUID(),
      date: today,
      startTime: currentTime,
      endTime: null,
      duration: null
    };
    
    setCurrentSession(newSession);
    setAllSessions(prev => [...prev, newSession]);
    setIsRunning(true);
  };

  const stopTimer = () => {
    if (currentSession) {
      const now = new Date();
      const currentTime = now.toISOString();
      const startTime = new Date(currentSession.startTime);
      const durationInSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      
      const updatedSession = {
        ...currentSession,
        endTime: currentTime,
        duration: durationInSeconds
      };
      
      setAllSessions(prev => 
        prev.map(session => 
          session.id === currentSession.id ? updatedSession : session
        )
      );
      
      setCurrentSession(null);
      setIsRunning(false);
    }
  };

  const getDailyTotal = (date: string): number => {
    return allSessions
      .filter(session => session.date === date && session.duration !== null)
      .reduce((total, session) => total + (session.duration || 0), 0);
  };

  return (
    <TimerContext.Provider value={{
      isRunning,
      currentSession,
      allSessions,
      startTimer,
      stopTimer,
      getDailyTotal
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = (): TimerContextType => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};
