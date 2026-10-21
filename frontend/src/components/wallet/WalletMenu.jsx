import { useEffect, useRef, useState } from 'react';
import { User, Wallet, LogOut } from 'lucide-react';
import './WalletPages.css';

// Popover opened from the sidebar wallet pill: Account, Wallet, Logout. `trigger(toggle, open)` renders the pill;
// `side` = 'up' (expanded sidebar) or 'right' (collapsed sidebar).

export default function WalletMenu({ theme = 'o1', side = 'up', onSelect, onLogout, trigger }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const pick = (fn) => () => {
    setOpen(false);
    fn?.();
  };

  return (
    <div ref={ref} className={`vwp-${theme} vwp-menu-wrap`}>
      {trigger(() => setOpen((v) => !v), open)}
      {open && (
        <div className={`vwp-menu vwp-menu-${side}`} role="menu">
          <button type="button" role="menuitem" onClick={pick(() => onSelect('account'))}>
            <User size={15} /> Account
          </button>
          <button type="button" role="menuitem" onClick={pick(() => onSelect('wallet'))}>
            <Wallet size={15} /> Wallet
          </button>
          <div className="vwp-menu-sep" />
          <button type="button" role="menuitem" className="danger" onClick={pick(onLogout)}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
