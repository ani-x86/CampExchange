import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warn' | 'error' | 'info';

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title: string;
  description?: string;
  duration?: number;
  undoAction?: () => void;
  undoLabel?: string;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const shouldReduceMotion = useReducedMotion();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ duration = 4000, ...options }: ToastOptions) => {
      const id = options.id || Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { ...options, id, duration };

      setToasts((prev) => [...prev.filter((t) => t.id !== id), newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }

      return id;
    },
    [dismiss]
  );

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />,
    warn: <AlertTriangle className="w-4 h-4 text-warn shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-danger shrink-0" />,
    info: <Info className="w-4 h-4 text-accent shrink-0" />,
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 left-4 right-4 sm:top-auto sm:bottom-4 sm:right-4 sm:left-auto z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-[calc(100vw-2rem)] sm:w-full"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 4, scale: 0.98 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
              className="pointer-events-auto flex items-start gap-3 p-3.5 bg-bg border border-line rounded-sm shadow-sm"
            >
              {icons[t.type || 'info']}
              <div className="flex-1 text-left">
                <p className="text-13 font-semibold text-ink leading-tight">{t.title}</p>
                {t.description && <p className="text-12 text-mute mt-0.5">{t.description}</p>}
                {t.undoAction && (
                  <button
                    type="button"
                    onClick={() => {
                      t.undoAction?.();
                      dismiss(t.id);
                    }}
                    className="mt-1 text-12 font-medium text-accent hover:underline cursor-pointer"
                  >
                    {t.undoLabel || 'Undo'}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-mute hover:text-ink transition-colors p-0.5 rounded-sm cursor-pointer"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
