import React from 'react';
import { Activity, KeyRound, Radio, RefreshCw, Trash2, Shield, Sun, Moon } from 'lucide-react';
import { WSConnectionStatus } from '../hooks/useStrategyWebSocket';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  wsStatus: WSConnectionStatus;
  userId: string;
  hasToken: boolean;
  onOpenSettings: () => void;
  onUnsubscribe: () => void;
  isUnsubscribing: boolean;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  wsStatus,
  userId,
  hasToken,
  onOpenSettings,
  onUnsubscribe,
  isUnsubscribing,
  onRefresh,
  isLoading,
}) => {
  const { isDark, toggleTheme } = useTheme();

  const getStatusBadge = () => {
    switch (wsStatus) {
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Real-time Feed
          </span>
        );
      case 'connecting':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            Connecting...
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            Feed Offline
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
            <Radio className="w-3 h-3" />
            Disconnected
          </span>
        );
    }
  };

  return (
    <header className="border-b border-slate-200 dark:border-[#232a35] bg-white/95 dark:bg-[#151921]/95 backdrop-blur-md sticky top-0 z-30 px-2 sm:px-3 md:px-12 py-2.5 transition-colors duration-200">
      <div className="w-full mx-auto flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-md shadow-indigo-600/30 ring-1 ring-white/20">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                FD Strategy Terminal
              </h1>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                PRO v2
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
              Derivatives Analytics, Payoff Curves & Portfolio Greeks
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {/* Realtime Status Indicator */}
          {getStatusBadge()}

          {/* User ID Badge */}
          {userId && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0d1117] border border-slate-200 dark:border-[#232a35] text-slate-700 dark:text-slate-300 font-mono font-semibold">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>{userId}</span>
            </div>
          )}

          {/* Recalculate / Sync Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-[#0d1117] dark:hover:bg-[#1c222b] text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 border border-slate-200 dark:border-[#232a35] hover:border-slate-300 dark:hover:border-[#353f4e] transition-all shadow-2xs active:scale-95 disabled:opacity-50"
            title="Recalculate & Sync"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-500 dark:text-indigo-400' : 'text-slate-400'}`} />
            <span>Sync</span>
          </button>

          {/* Unsubscribe Button */}
          <button
            onClick={onUnsubscribe}
            disabled={isUnsubscribing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/25 hover:border-rose-300 dark:hover:border-rose-500/40 transition-all shadow-2xs active:scale-95 disabled:opacity-50"
            title="Unsubscribe strategy from live stream"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Unsubscribe</span>
          </button>

          {/* Credentials Button */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all shadow-2xs active:scale-95 ${
              hasToken
                ? 'bg-slate-100 hover:bg-slate-200/80 dark:bg-[#0d1117] dark:hover:bg-[#1c222b] text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 border-slate-200 dark:border-[#232a35] hover:border-slate-300 dark:hover:border-[#353f4e]'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-600/30 animate-pulse'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{hasToken ? 'Credentials' : 'Set Token'}</span>
          </button>

          {/* Dark / Light Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-[#0d1117] dark:hover:bg-[#1c222b] border border-slate-200 dark:border-[#232a35] hover:border-slate-300 dark:hover:border-[#353f4e] text-slate-600 dark:text-amber-400 transition-all shadow-2xs active:scale-90"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 transition-transform duration-200 hover:-rotate-12" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

