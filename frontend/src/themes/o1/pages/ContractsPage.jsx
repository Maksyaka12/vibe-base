import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Button, SectionTitle } from '../components/ui';

const CONTRACTS = [
  {
    id: 'token',
    title: '$VIBE Token contract',
    address: '0xb200000000000000000000df24ecb8bf51100a01',
    basescanUrl: 'https://basescan.org/token/0xb200000000000000000000df24ecb8bf51100a01'
  },
  {
    id: 'buyback',
    title: 'Buyback, burn & community pool address',
    address: '0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf',
    basescanUrl: 'https://basescan.org/address/0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf#transactions'
  },
  {
    id: 'nft',
    title: 'Vibe Club NFT contract',
    address: '0x9E92307Dbec2d0aE4BBF14cA93E1cA00edC4b886',
    basescanUrl: 'https://basescan.org/address/0x9E92307Dbec2d0aE4BBF14cA93E1cA00edC4b886'
  },
  {
    id: 'holder-distributor',
    title: 'Holder rewards distributor (Unlock 1-2)',
    address: '0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089',
    basescanUrl: 'https://basescan.org/address/0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089'
  },
  {
    id: 'royalty-distributor',
    title: 'NFT royalty distributor (Royalty 1-6)',
    address: '0x3753EE7fa9538087f901aa5E4afc12dBA57B97c1',
    basescanUrl: 'https://basescan.org/address/0x3753EE7fa9538087f901aa5E4afc12dBA57B97c1'
  },
  {
    id: 'holder-distributor-v2',
    title: 'Holder rewards distributor (Unlock 3+)',
    address: '0x90B855994D9ba328399d87d0285b7D7f7B8E2c80',
    basescanUrl: 'https://basescan.org/address/0x90B855994D9ba328399d87d0285b7D7f7B8E2c80'
  },
  {
    id: 'royalty-distributor-v2',
    title: 'NFT royalty distributor (Royalty 7+)',
    address: '0xeEb47756fBf417907B2Be94aCcfB851a224add2c',
    basescanUrl: 'https://basescan.org/address/0xeEb47756fBf417907B2Be94aCcfB851a224add2c'
  },
  {
    id: 'daily-checkin',
    title: 'Daily check-in & streak contract',
    address: '0x1938BA215ef556e51eE6AaF909e0970AE0167634',
    basescanUrl: 'https://basescan.org/address/0x1938BA215ef556e51eE6AaF909e0970AE0167634'
  },
  {
    id: 'achievements',
    title: 'Achievements & SBT badges contract',
    address: '0x1336E381768c98c8A6e79d99Ec065684c41925A5',
    basescanUrl: 'https://basescan.org/address/0x1336E381768c98c8A6e79d99Ec065684c41925A5'
  }
];

const SECTIONS = [
  { title: 'Core', ids: ['token', 'buyback'] },
  { title: 'Contracts v2', ids: ['nft', 'holder-distributor-v2', 'royalty-distributor-v2', 'daily-checkin', 'achievements'] },
  { title: 'Contracts v1', ids: ['holder-distributor', 'royalty-distributor'] }
];

function ContractItemCard({ item }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!item.address) return;
    navigator.clipboard.writeText(item.address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const url = item.basescanUrl || `https://basescan.org/address/${item.address}`;

  return (
    <div className="o1-contract-card">
      <div className="o1-contract-info">
        <span className="o1-contract-title">{item.title}</span>
        <span className="o1-contract-address" title={item.address}>
          {item.address}
        </span>
      </div>

      <div className="o1-contract-actions">
        <Button variant="secondary" size="sm" onClick={handleCopy}>
          {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          as="a"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>BaseScan</span>
          <ExternalLink size={13} />
        </Button>
      </div>
    </div>
  );
}

export default function ContractsPage() {
  return (
    <div className="o1-contracts-container">
      {SECTIONS.map(({ title, ids }) => (
        <div key={title} className="o1-contracts-section">
          <SectionTitle title={title} count={ids.length} />
          {ids.map((id) => (
            <ContractItemCard key={id} item={CONTRACTS.find((item) => item.id === id)} />
          ))}
        </div>
      ))}
    </div>
  );
}
