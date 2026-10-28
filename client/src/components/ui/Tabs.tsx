import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={clsx('flex items-center border-b border-line gap-4 sm:gap-6 overflow-x-auto no-scrollbar', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={clsx(
              'relative pb-3 pt-1 text-13 sm:text-14 font-medium transition-colors cursor-pointer select-none whitespace-nowrap flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm',
              isActive ? 'text-ink' : 'text-mute hover:text-ink'
            )}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={clsx(
                  'text-11 px-1.5 py-0.5 rounded-sm font-mono',
                  isActive ? 'bg-surface text-ink border border-line' : 'bg-surface text-mute'
                )}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="active-tab-underline"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 500, damping: 35 }
                }
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
