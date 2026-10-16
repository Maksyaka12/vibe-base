import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui';

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
    title: 'Holder rewards distributor contract',
    address: '0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089',
    basescanUrl: 'https://basescan.org/address/0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089'
  },
  {
    id: 'royalty-distributor',
    title: 'NFT royalty distributor contract',
    address: '0x3753EE7fa9538087f901aa5E4afc12dBA57B97c1',
    basescanUrl: 'https://basescan.org/address/0x3753EE7fa9538087f901aa5E4afc12dBA57B97c1'
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
    address: '0x10667fF580e6fc2edfFC35991fACb05C2681E757',
    basescanUrl: 'https://basescan.org/address/0x10667fF580e6fc2edfFC35991fACb05C2681E757'
  },
  {
    id: 'coordinator',
    title: 'Master AI agent coordinator & registry',
    address: '0x5c48Ed8E0619d3eD29BdDcE62d2e7746E18d1469',
    basescanUrl: 'https://basescan.org/address/0x5c48Ed8E0619d3eD29BdDcE62d2e7746E18d1469'
  }
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

export default function ContractsPage({ isBaseAppMode = false } = {}) {
  return (
    <div className="o1-contracts-container">
      {CONTRACTS.map((item) => (
        <ContractItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
