import React, { useCallback, useState, createContext, useContext } from 'react';
interface TabsProps {
  defaultValue?: string;
  value?: string;
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
}

const TabsContext = createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({
  value: '',
  onValueChange: () => {}
});

export function Tabs({
  defaultValue,
  value: controlledValue,
  children,
  onValueChange
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || controlledValue || '');

  // Use controlled value if provided, otherwise use internal state
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleValueChange = useCallback((newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  }, [controlledValue, onValueChange]);

  return <TabsContext.Provider value={{
    value,
    onValueChange: handleValueChange
  }}>
      <div className="w-full">{children}</div>
    </TabsContext.Provider>;
}
export function TabsList({
  children,
  className = ''
}: TabsListProps) {
  return <div className={`inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 ${className}`}>
      {children}
    </div>;
}
export function TabsTrigger({
  value,
  children,
  className = ''
}: TabsTriggerProps) {
  const {
    value: selectedValue,
    onValueChange
  } = useContext(TabsContext);
  const isActive = selectedValue === value;
  return <button className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${isActive ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'} ${className}`} onClick={() => onValueChange(value)}>
      {children}
    </button>;
}
export function TabsContent({
  value,
  children
}: TabsContentProps) {
  const {
    value: selectedValue
  } = useContext(TabsContext);
  if (selectedValue !== value) return null;
  return <div className="mt-2">{children}</div>;
}