import { useSyncExternalStore } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { DEMO_ADDRESS, isDemoActive, subscribeDemo } from '../config/demo';

/** Whether the #demo flag is set (ignores the wallet). */
export function useDemoFlag() {
  return useSyncExternalStore(subscribeDemo, isDemoActive, () => false);
}

/** Read-only demo: on while #demo is set and no wallet is connected. */
export function useDemoMode() {
  const flag = useDemoFlag();
  const { authenticated } = usePrivy();
  const demo = flag && !authenticated;
  return { demo, address: demo ? DEMO_ADDRESS : null };
}
