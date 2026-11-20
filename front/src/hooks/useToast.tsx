import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Toast } from '@/components/bank/Toast';

type ToastContextValue = {
  show: (message: string) => void;
  /** Shortcut for buttons the prototype does not implement on purpose. */
  demoOnly: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS = 2200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast((t) => ({ id: (t?.id ?? 0) + 1, message }));
    timer.current = setTimeout(() => setToast(null), DURATION_MS);
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const demoOnly = useCallback(() => show('Demo only · not part of this prototype'), [show]);
  const value = useMemo(() => ({ show, demoOnly }), [show, demoOnly]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && <Toast key={toast.id} message={toast.message} />}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
