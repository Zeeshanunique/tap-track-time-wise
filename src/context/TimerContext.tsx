import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

interface TimerSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  duration: number | null; // in seconds
}

// We no longer need this interface since we're using the proper types from supabase
type TimerSessionRow = Database['public']['Tables']['timer_sessions']['Row'];

interface TimerContextType {
  isRunning: boolean;
  currentSession: TimerSession | null;
  allSessions: TimerSession[];
  startTimer: () => Promise<void>;
  stopTimer: () => Promise<void>;
  getDailyTotal: (date: string) => number;
  syncPendingOperations: () => Promise<void>;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

// Backup to localStorage in case of no internet connection
const LOCAL_STORAGE_KEY = 'tap-track-sessions';
const PENDING_START_KEY = 'pending_session_start';
const PENDING_STOP_KEY = 'pending_session_stop';

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState<TimerSession | null>(null);
  const [allSessions, setAllSessions] = useState<TimerSession[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Online/offline status detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingOperations();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync any pending operations when the app comes online
  const syncPendingOperations = async () => {
    if (!isOnline) return;

    try {
      // Check for pending session starts
      const pendingStartStr = localStorage.getItem(PENDING_START_KEY);
      if (pendingStartStr) {
        const pendingStart = JSON.parse(pendingStartStr) as TimerSession;
        
        const { error } = await supabase
          .from('timer_sessions')
          .insert({
            id: pendingStart.id,
            date: pendingStart.date,
            start_time: pendingStart.startTime,
            end_time: null,
            duration: null
          });
          
        if (!error) {
          localStorage.removeItem(PENDING_START_KEY);
          console.log('Successfully synced pending session start');
        }
      }
      
      // Check for pending session stops
      const pendingStopStr = localStorage.getItem(PENDING_STOP_KEY);
      if (pendingStopStr) {
        const pendingStop = JSON.parse(pendingStopStr) as TimerSession;
        
        const { error } = await supabase
          .from('timer_sessions')
          .update({
            end_time: pendingStop.endTime,
            duration: pendingStop.duration
          })
          .eq('id', pendingStop.id);
          
        if (!error) {
          localStorage.removeItem(PENDING_STOP_KEY);
          console.log('Successfully synced pending session stop');
        }
      }
    } catch (error) {
      console.error('Error syncing pending operations:', error);
    }
  };

  // Load sessions from Supabase on initial render
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        // Use proper typing without type assertion
        const { data, error } = await supabase
          .from('timer_sessions')
          .select('*');
        
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
          const formattedSessions = data.map((session: TimerSessionRow) => ({
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
        setInitialized(true);
      }
    };

    fetchSessions();
    
    // Try to sync any pending operations from previous sessions
    if (navigator.onLine) {
      syncPendingOperations();
    }

    // Set up subscription for real-time updates
    const subscription = supabase
      .channel('timer_sessions_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'timer_sessions' 
      }, (payload) => {
        console.log('Real-time update received:', payload);
        fetchSessions(); // Refresh data when changes occur
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Save sessions to localStorage as a backup
  useEffect(() => {
    if (initialized) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSessions));
    }
  }, [allSessions, initialized]);

  const startTimer = async () => {
    try {
      // Check if a session is already running
      if (isRunning || currentSession) {
        console.warn('Timer is already running');
        return;
      }
      
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toISOString();
      
      // Generate a secure UUID for the session
      const sessionId = crypto.randomUUID();
      
      const newSession: TimerSession = {
        id: sessionId,
        date: today,
        startTime: currentTime,
        endTime: null,
        duration: null
      };
      
      // Try to save to Supabase if online
      if (isOnline) {
        const { error } = await supabase
          .from('timer_sessions')
          .insert({
            id: newSession.id,
            date: newSession.date,
            start_time: newSession.startTime,
            end_time: null,
            duration: null
          });

        if (error) {
          console.error('Error starting timer in Supabase:', error);
          // Continue with local state updates, but save to localStorage as backup
          localStorage.setItem(PENDING_START_KEY, JSON.stringify(newSession));
        }
      } else {
        // We're offline, save to pending operations
        localStorage.setItem(PENDING_START_KEY, JSON.stringify(newSession));
      }
      
      setCurrentSession(newSession);
      setAllSessions(prev => [...prev, newSession]);
      setIsRunning(true);
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const stopTimer = async () => {
    if (!currentSession) {
      console.warn('No active session to stop');
      return;
    }

    try {
      const now = new Date();
      const currentTime = now.toISOString();
      const startTime = new Date(currentSession.startTime);
      
      // Validate the start time is valid and in the past
      if (isNaN(startTime.getTime()) || startTime > now) {
        console.error('Invalid start time for session');
        return;
      }
      
      const durationInSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      
      // Validate duration (should be positive and reasonable)
      if (durationInSeconds <= 0) {
        console.error('Invalid session duration');
        return;
      }
      
      const updatedSession = {
        ...currentSession,
        endTime: currentTime,
        duration: durationInSeconds
      };
      
      // Try to update Supabase if online
      if (isOnline) {
        const { error } = await supabase
          .from('timer_sessions')
          .update({
            end_time: updatedSession.endTime,
            duration: updatedSession.duration
          })
          .eq('id', updatedSession.id);

        if (error) {
          console.error('Error stopping timer in Supabase:', error);
          // Save to localStorage as backup for later sync
          localStorage.setItem(PENDING_STOP_KEY, JSON.stringify(updatedSession));
        }
      } else {
        // We're offline, save to pending operations
        localStorage.setItem(PENDING_STOP_KEY, JSON.stringify(updatedSession));
      }
      
      // Update the local state
      setAllSessions(prev => 
        prev.map(session => 
          session.id === currentSession.id ? updatedSession : session
        )
      );
      
      setCurrentSession(null);
      setIsRunning(false);
    } catch (error) {
      console.error('Failed to stop timer:', error);
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
      getDailyTotal,
      syncPendingOperations
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
