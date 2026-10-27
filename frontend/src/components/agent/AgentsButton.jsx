import { Bot } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import './AgentsPage.css';

// Header entry to /agents.
export default function AgentsButton({ theme = 'o1' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname.toLowerCase().includes('agents');

  const open = () => {
    navigate(location.pathname.startsWith('/app') ? '/app/agents' : '/agents');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button type="button" className={`agb agb-${theme} ${active ? 'on' : ''}`} onClick={open} title="Vibe Agents: let your AI run Vibe Hub">
      <span className="agb-icon"><Bot size={15} /></span>
      <span className="agb-text">Agents</span>
    </button>
  );
}
