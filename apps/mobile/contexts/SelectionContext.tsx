/**
 * Selection Context
 * 
 * Provides a way for WebViewMarkdown to notify parent ScrollViews
 * when text selection is active, so they can disable scrolling
 * and allow selection handle dragging.
 * 
 * This fixes the "can select word but can't drag handles" issue
 * caused by parent ScrollView stealing pan gestures.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SelectionContextType {
  isSelecting: boolean;
  setIsSelecting: (value: boolean) => void;
}

const SelectionContext = createContext<SelectionContextType>({
  isSelecting: false,
  setIsSelecting: () => {},
});

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [isSelecting, setIsSelectingState] = useState(false);
  
  const setIsSelecting = useCallback((value: boolean) => {
    setIsSelectingState(value);
  }, []);
  
  return (
    <SelectionContext.Provider value={{ isSelecting, setIsSelecting }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  return useContext(SelectionContext);
}

export default SelectionContext;

