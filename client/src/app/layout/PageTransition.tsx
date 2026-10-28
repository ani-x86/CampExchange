import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useUiStore } from '@/store/ui';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const shouldReduceMotion = useReducedMotion();
  const { navigationDirection } = useUiStore();

  const initialX = shouldReduceMotion ? 0 : navigationDirection === 'back' ? -8 : 8;

  return (
    <motion.div
      initial={{ opacity: 0, x: initialX }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.18,
        ease: [0.22, 0.61, 0.36, 1],
      }}
      className="w-full flex-1 flex flex-col min-w-0"
    >
      {children}
    </motion.div>
  );
};
