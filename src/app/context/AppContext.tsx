'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface SessionStats {
  filesProcessed: number;
  bytesSaved: number;
}

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  stats: SessionStats;
  addProcessedStat: (bytesSaved: number) => void;
  clearStats: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ filesProcessed: 0, bytesSaved: 0 });

  // Initialize Theme and Stats from localStorage on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const storedStats = localStorage.getItem('session_stats');
    if (storedStats) {
      try {
        setStats(JSON.parse(storedStats));
      } catch (e) {
        console.error('Failed to parse session stats from storage', e);
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const addProcessedStat = (bytesSaved: number) => {
    setStats((prev) => {
      const updated = {
        filesProcessed: prev.filesProcessed + 1,
        bytesSaved: prev.bytesSaved + Math.max(0, bytesSaved),
      };
      localStorage.setItem('session_stats', JSON.stringify(updated));
      return updated;
    });
  };

  const clearStats = () => {
    const defaultStats = { filesProcessed: 0, bytesSaved: 0 };
    setStats(defaultStats);
    localStorage.setItem('session_stats', JSON.stringify(defaultStats));
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        isSidebarOpen,
        setSidebarOpen,
        stats,
        addProcessedStat,
        clearStats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
