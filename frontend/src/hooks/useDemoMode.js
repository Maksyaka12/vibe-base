import { useSyncExternalStore } from 'react';
import { DEMO_ADDRESS, isDemoActive, subscribeDemo } from '../config/demo';

/** Whether the #demo flag is set. */
export function useDemoFlag() {
  return useSyncExternalStore(subscribeDemo, isDemoActive, () => false);
}

/**
 * Read-only demo: on while #demo is set, with or without a connected wallet. The site then shows the demo
 * address, and every transaction path (isDemoActive) shows a preview instead of sending.
 */
export function useDemoMode() {
  const demo = useDemoFlag();
  return { demo, address: demo ? DEMO_ADDRESS : null };
}
