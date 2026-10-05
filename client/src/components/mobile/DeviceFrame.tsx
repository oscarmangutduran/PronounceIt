import React, { ReactNode } from 'react';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';

interface DeviceFrameProps {
  children: ReactNode;
  deviceType?: 'iphone' | 'android' | 'compact';
  isDarkMode?: boolean;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  children,
  deviceType = 'iphone',
  isDarkMode = false,
}) => {
  // Current simulated time
  const currentTime = '09:41';

  return (
    <div className="relative mx-auto transition-all duration-300">
      {/* Outer Phone Shell */}
      <div
        className={`relative w-[380px] sm:w-[400px] h-[820px] max-h-[92vh] rounded-[48px] p-3 shadow-2xl transition-colors duration-300 ${
          isDarkMode
            ? 'bg-slate-900 border-4 border-slate-700 shadow-slate-950/80 ring-1 ring-slate-800'
            : 'bg-slate-900 border-4 border-slate-800 shadow-slate-900/30 ring-1 ring-slate-700/50'
        }`}
      >
        {/* Side physical buttons (simulated) */}
        <div className="absolute -left-[7px] top-[115px] w-[3px] h-[28px] bg-slate-700 rounded-l-sm" />
        <div className="absolute -left-[7px] top-[160px] w-[3px] h-[50px] bg-slate-700 rounded-l-sm" />
        <div className="absolute -left-[7px] top-[220px] w-[3px] h-[50px] bg-slate-700 rounded-l-sm" />
        <div className="absolute -right-[7px] top-[180px] w-[3px] h-[75px] bg-slate-700 rounded-r-sm" />

        {/* Screen Bezel & Canvas */}
        <div
          className={`relative w-full h-full rounded-[38px] overflow-hidden flex flex-col transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
          }`}
        >
          {/* Top Status Bar & Dynamic Island */}
          <div className="relative shrink-0 h-11 px-6 flex items-center justify-between text-xs select-none z-30 pt-1">
            <span className="font-semibold tracking-tight text-[13px]">{currentTime}</span>

            {/* Dynamic Island / Camera hole */}
            <div className="absolute left-1/2 -translate-x-1/2 top-2 bg-black rounded-full h-[24px] w-[100px] flex items-center justify-center gap-2 px-2 shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ring-1 ring-slate-800/80" />
              <div className="w-2 h-2 rounded-full bg-slate-950" />
            </div>

            {/* Status Icons */}
            <div className="flex items-center gap-1.5 opacity-90">
              <Signal size={13} strokeWidth={2.2} />
              <Wifi size={13} strokeWidth={2.2} />
              <BatteryMedium size={15} strokeWidth={2.2} />
            </div>
          </div>

          {/* Scrollable Screen Content */}
          <div className="relative flex-1 overflow-hidden flex flex-col">
            {children}
          </div>

          {/* Bottom Home Indicator */}
          <div className="relative shrink-0 h-5 flex items-center justify-center pointer-events-none z-30">
            <div className="w-32 h-1 bg-slate-400/60 dark:bg-slate-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
