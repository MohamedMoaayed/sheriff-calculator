'use client';

import { createContext, useContext, useCallback, useState, ReactNode } from 'react';

type Toast = { id: number; message: string; emoji?: string };
const ToastContext = createContext<(msg: string, emoji?: string) => void>(() => {});

export function useToast() { return useContext(ToastContext); }

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, emoji = '📢') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, emoji }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            {t.emoji} {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
