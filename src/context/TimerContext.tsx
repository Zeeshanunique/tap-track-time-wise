
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TimerSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  duration: number | null; // in seconds
}

// This interface extends the existing Database types with our new timer_sessions table
interface CustomDatabase {
  timer_sessions: {
    id: string;
    date: string;
    start_time: string;
    end_time: string | null;
    duration: number | null;
    created_at: string | null;
  }
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

// Backup to localStorage in case of no internet connection
const LOCAL_STORAGE_KEY = 'tap-track-sessions';

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState<TimerSession | null>(null);
  const [allSessions, setAllSessions] = useState<TimerSession[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Load sessions from Supabase on initial render
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        // Use type assertion to inform TypeScript about the timer_sessions table
        const { data, error } = await supabase
          .from('timer_sessions')
          .select('*') as unknown as { 
            data: CustomDatabase['timer_sessions'][] | null; 
            error: Error | null 
          };
        
        if (error) {
          console.error('Error fetching sessions:', error);
          // Fallback to localStorage if Supabase fails
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
        } else if (data) {
          // Transform from Supabase format to our app format
          const formattedSessions = data.map((session) => ({
            id: session.id,
            date: session.date,
            startTime: session.start_time,
            endTime: session.end_time,
            duration: session.duration,
          }));
          
          setAllSessions(formattedSessions);
          
          // Check if there's an active session
          const activeSession = formattedSessions.find((session) => session.endTime === null);
          if (activeSession) {
            setCurrentSession(activeSession);
            setIsRunning(true);
          }
        }
        setInitialized(true);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      }
    };

    fetchSessions();
  }, []);

  // Save sessions to localStorage as a backup
  useEffect(() => {
    if (initialized) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSessions));
    }
  }, [allSessions, initialized]);

  const startTimer = async () => {
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
    
    try {
      // Save to Supabase with type assertion
      const { data, error } = await supabase
        .from('timer_sessions')
        .insert({
          id: newSession.id,
          date: newSession.date,
          start_time: newSession.startTime,
          end_time: null,
          duration: null
        }) as unknown as {
          data: CustomDatabase['timer_sessions'] | null;
          error: Error | null;
        };

      if (error) {
        console.error('Error starting timer in Supabase:', error);
      }
    } catch (error) {
      console.error('Failed to start timer in Supabase:', error);
    }
    
    setCurrentSession(newSession);
    setAllSessions(prev => [...prev, newSession]);
    setIsRunning(true);
    setInitialized(true);
  };

  const stopTimer = async () => {
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
      
      try {
        // Update in Supabase with type assertion
        const { error } = await supabase
          .from('timer_sessions')
          .update({
            end_time: updatedSession.endTime,
            duration: updatedSession.duration
          })
          .eq('id', updatedSession.id) as unknown as {
            error: Error | null;
          };

        if (error) {
          console.error('Error stopping timer in Supabase:', error);
        }
      } catch (error) {
        console.error('Failed to stop timer in Supabase:', error);
      }
      
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
