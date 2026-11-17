import React, { createContext, useContext, useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (val: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: {
  defaultValue: string;
  value?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [internalTab, setInternalTab] = useState(defaultValue);
  const activeTab = value !== undefined ? value : internalTab;

  const setActiveTab = (val: string) => {
    if (value === undefined) {
      setInternalTab(val);
    }
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={twMerge(
        clsx(
          'scrollbar-none flex h-11 w-full max-w-full items-center justify-start gap-1 overflow-x-auto rounded-lg border border-border bg-surface-subtle p-1 text-muted-foreground sm:inline-flex sm:w-auto',
          className
        )
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const isActive = context.activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => context.setActiveTab(value)}
      className={twMerge(
        clsx(
          'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium sm:px-3.5 sm:text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
          isActive
            ? 'bg-surface text-foreground shadow-sm'
            : 'hover:text-foreground text-muted-foreground',
          className
        )
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  if (context.activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      className={twMerge(clsx('mt-4 focus-visible:outline-none', className))}
    >
      {children}
    </div>
  );
}

