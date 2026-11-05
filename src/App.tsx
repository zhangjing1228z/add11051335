import { useState, useEffect, useCallback, useRef } from 'react';

// Types
type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface TimerSettings {
  focus: number;
  shortBreak: number;
  longBreak: number;
}

interface TodayStats {
  date: string;
  completedSessions: number;
  totalFocusMinutes: number;
}

// Constants
const DEFAULT_SETTINGS: TimerSettings = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
};

const MODE_LABELS: Record<TimerMode, string> = {
  focus: '专注',
  shortBreak: '短休息',
  longBreak: '长休息',
};

const MODE_COLORS: Record<TimerMode, { bg: string; ring: string; btn: string; text: string }> = {
  focus: {
    bg: 'bg-gradient-to-br from-red-50 to-orange-50',
    ring: 'stroke-red-500',
    btn: 'bg-red-500 hover:bg-red-600',
    text: 'text-red-600',
  },
  shortBreak: {
    bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
    ring: 'stroke-green-500',
    btn: 'bg-green-500 hover:bg-green-600',
    text: 'text-green-600',
  },
  longBreak: {
    bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    ring: 'stroke-blue-500',
    btn: 'bg-blue-500 hover:bg-blue-600',
    text: 'text-blue-600',
  },
};

// Utility functions
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function loadSettings(): TimerSettings {
  try {
    const saved = localStorage.getItem('pomodoro-settings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: TimerSettings): void {
  localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
}

function loadTodayStats(): TodayStats {
  try {
    const saved = localStorage.getItem('pomodoro-stats');
    if (saved) {
      const stats: TodayStats = JSON.parse(saved);
      if (stats.date === getTodayKey()) return stats;
    }
  } catch {}
  return { date: getTodayKey(), completedSessions: 0, totalFocusMinutes: 0 };
}

function saveTodayStats(stats: TodayStats): void {
  localStorage.setItem('pomodoro-stats', JSON.stringify(stats));
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Components
function CircularProgress({ progress, mode }: { progress: number; mode: TimerMode }) {
  const radius = 140;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <svg width={radius * 2} height={radius * 2} className="transform -rotate-90">
      <circle
        stroke="currentColor"
        className="text-gray-200"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        className={`timer-ring ${MODE_COLORS[mode].ring}`}
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
    </svg>
  );
}

function ModeSelector({ mode, onModeChange }: { mode: TimerMode; onModeChange: (m: TimerMode) => void }) {
  const modes: TimerMode[] = ['focus', 'shortBreak', 'longBreak'];

  return (
    <div className="flex gap-2 mb-8">
      {modes.map((m) => (
        <button
          key={m}
          onClick={() => onModeChange(m)}
          className={`mode-btn px-4 py-2 rounded-full text-sm font-medium transition-all ${
            mode === m
              ? `${MODE_COLORS[m].btn} text-white shadow-lg active`
              : 'bg-white/80 text-gray-600 hover:bg-white shadow-sm'
          }`}
        >
          {MODE_LABELS[m]}
        </button>
      ))}
    </div>
  );
}

function TimerDisplay({ time, mode, isRunning, totalTime }: { time: number; mode: TimerMode; isRunning: boolean; totalTime: number }) {
  const progress = 1 - time / totalTime;

  return (
    <div className="relative flex items-center justify-center mb-8">
      <CircularProgress progress={progress} mode={mode} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-6xl font-bold tracking-tight ${MODE_COLORS[mode].text}`}>
          {formatTime(time)}
        </span>
        <span className="text-sm text-gray-500 mt-2 flex items-center gap-2">
          {isRunning && <span className="pulse-dot inline-block w-2 h-2 rounded-full bg-current opacity-70"></span>}
          {MODE_LABELS[mode]}
        </span>
      </div>
    </div>
  );
}

function Controls({
  isRunning,
  onStart,
  onPause,
  onReset,
  mode,
}: {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  mode: TimerMode;
}) {
  return (
    <div className="flex gap-4 justify-center">
      {!isRunning ? (
        <button
          onClick={onStart}
          className={`${MODE_COLORS[mode].btn} text-white px-8 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}
        >
          <i className="fas fa-play mr-2"></i>开始
        </button>
      ) : (
        <button
          onClick={onPause}
          className="bg-gray-700 hover:bg-gray-800 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
        >
          <i className="fas fa-pause mr-2"></i>暂停
        </button>
      )}
      <button
        onClick={onReset}
        className="bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-full font-medium shadow-md hover:shadow-lg transition-all border border-gray-200"
      >
        <i className="fas fa-redo mr-2"></i>重置
      </button>
    </div>
  );
}

function StatsPanel({ stats }: { stats: TodayStats }) {
  return (
    <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        <i className="fas fa-chart-bar mr-2"></i>今日统计
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-red-50 rounded-xl">
          <div className="text-2xl font-bold text-red-600">{stats.completedSessions}</div>
          <div className="text-xs text-gray-500 mt-1">完成番茄数</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-xl">
          <div className="text-2xl font-bold text-orange-600">{stats.totalFocusMinutes}</div>
          <div className="text-xs text-gray-500 mt-1">专注分钟</div>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({
  settings,
  onSettingsChange,
  isOpen,
  onToggle,
}: {
  settings: TimerSettings;
  onSettingsChange: (s: TimerSettings) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const handleChange = (key: keyof TimerSettings, value: number) => {
    const clamped = Math.max(1, Math.min(120, value));
    onSettingsChange({ ...settings, [key]: clamped });
  };

  if (!isOpen) return null;

  return (
    <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100 fade-in">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        <i className="fas fa-cog mr-2"></i>自定义时长
      </h3>
      <div className="space-y-4">
        {(['focus', 'shortBreak', 'longBreak'] as const).map((key) => (
          <div key={key} className="flex items-center justify-between">
            <label className="text-sm text-gray-600 font-medium">{MODE_LABELS[key]}</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleChange(key, settings[key] - 1)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <i className="fas fa-minus text-xs"></i>
              </button>
              <span className="w-12 text-center font-semibold text-gray-800">{settings[key]} 分</span>
              <button
                onClick={() => handleChange(key, settings[key] + 1)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main App
export default function App() {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [settings, setSettings] = useState<TimerSettings>(loadSettings);
  const [stats, setStats] = useState<TodayStats>(loadTodayStats);
  const [timeLeft, setTimeLeft] = useState(settings.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const totalTime = settings[mode] * 60;

  // Save settings when they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer completed
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const handleTimerComplete = useCallback(() => {
    if (mode === 'focus') {
      const newStats = {
        ...stats,
        completedSessions: stats.completedSessions + 1,
        totalFocusMinutes: stats.totalFocusMinutes + settings.focus,
      };
      setStats(newStats);
      saveTodayStats(newStats);

      // Play notification sound
      playNotification();
    }
  }, [mode, stats, settings.focus]);

  const playNotification = () => {
    // Create a simple beep using Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 300);
    } catch {}
  };

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(settings[mode] * 60);
  };

  const handleModeChange = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(settings[newMode] * 60);
  };

  const handleSettingsChange = (newSettings: TimerSettings) => {
    setSettings(newSettings);
    if (!isRunning) {
      setTimeLeft(newSettings[mode] * 60);
    }
  };

  // Update document title with timer
  useEffect(() => {
    document.title = isRunning
      ? `${formatTime(timeLeft)} - ${MODE_LABELS[mode]} | 番茄专注`
      : '番茄专注 - Pomodoro Timer';
  }, [timeLeft, isRunning, mode]);

  return (
    <div className={`min-h-screen ${MODE_COLORS[mode].bg} transition-colors duration-500`}>
      <div className="max-w-md mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <span className="text-3xl">🍅</span>
            番茄专注
          </h1>
          <p className="text-sm text-gray-500 mt-1">专注每一刻</p>
        </header>

        {/* Mode Selector */}
        <div className="flex justify-center">
          <ModeSelector mode={mode} onModeChange={handleModeChange} />
        </div>

        {/* Timer */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <TimerDisplay time={timeLeft} mode={mode} isRunning={isRunning} totalTime={totalTime} />

          {/* Controls */}
          <Controls
            isRunning={isRunning}
            onStart={handleStart}
            onPause={handlePause}
            onReset={handleReset}
            mode={mode}
          />
        </div>

        {/* Stats */}
        <StatsPanel stats={stats} />

        {/* Settings Toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-1"
        >
          <i className={`fas fa-chevron-${showSettings ? 'up' : 'down'} text-xs`}></i>
          {showSettings ? '收起设置' : '自定义时长'}
        </button>

        {/* Settings Panel */}
        <SettingsPanel
          settings={settings}
          onSettingsChange={handleSettingsChange}
          isOpen={showSettings}
          onToggle={() => setShowSettings(!showSettings)}
        />

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 mt-6 pb-4">
          数据保存在本地浏览器中
        </footer>
      </div>
    </div>
  );
}
