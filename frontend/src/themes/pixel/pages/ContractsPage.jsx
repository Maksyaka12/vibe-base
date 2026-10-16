import React, { useState } from 'react';
import { Copy, Check, ArrowUpRight } from 'lucide-react';

const CONTRACTS = [
  {
    id: 'token',
    title: '$VIBE Token Contract',
    address: '0xb200000000000000000000df24ecb8bf51100a01',
    basescanUrl: 'https://basescan.org/token/0xb200000000000000000000df24ecb8bf51100a01'
  },
  {
    id: 'buyback',
    title: 'Buyback & Burn & Community Pool Address',
    address: '0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf',
    basescanUrl: 'https://basescan.org/address/0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf#transactions'
  },
  {
    id: 'nft',
    title: 'Vibe Club NFT Contract',
    address: '0x9E92307Dbec2d0aE4BBF14cA93E1cA00edC4b886',
    basescanUrl: 'https://basescan.org/address/0x9E92307Dbec2d0aE4BBF14cA93E1cA00edC4b886'
  },
  {
    id: 'holder-distributor',
    title: 'Holder Rewards Distributor Contract',
    address: '0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089',
    basescanUrl: 'https://basescan.org/address/0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089'
  },
  {
    id: 'royalty-distributor',
    title: 'NFT Royalty Distributor Contract',
    address: '0x3753EE7fa9538087f901aa5E4afc12dBA57B97c1',
    basescanUrl: 'https://basescan.org/address/0x3753EE7fa9538087f901aa5E4afc12dBA57B97c1'
  },
  {
    id: 'daily-checkin',
    title: 'Daily Check-In & Streak Contract',
    address: '0x1938BA215ef556e51eE6AaF909e0970AE0167634',
    basescanUrl: 'https://basescan.org/address/0x1938BA215ef556e51eE6AaF909e0970AE0167634'
  },
  {
    id: 'achievements',
    title: 'Achievements & SBT Badges Contract',
    address: '0x10667fF580e6fc2edfFC35991fACb05C2681E757',
    basescanUrl: 'https://basescan.org/address/0x10667fF580e6fc2edfFC35991fACb05C2681E757'
  },
  {
    id: 'coordinator',
    title: 'Master AI Agent Coordinator & Registry',
    address: '0x5c48Ed8E0619d3eD29BdDcE62d2e7746E18d1469',
    basescanUrl: 'https://basescan.org/address/0x5c48Ed8E0619d3eD29BdDcE62d2e7746E18d1469'
  }
];

function DocContractCard({ item, isBaseAppMode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!item.address) return;
    navigator.clipboard.writeText(item.address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const url = item.basescanUrl || `https://basescan.org/address/${item.address}`;

  if (isBaseAppMode) {
    return (
      <div className="contracts-card">
        <div className="contracts-card-title">
          {item.title}
        </div>

        <div className="contracts-card-addr-row">
          <span className="contracts-card-addr-text" title={item.address}>
            {item.address}
          </span>

          <div className="contracts-btn-group">
            <button
              type="button"
              className={`contracts-copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="contracts-scan-btn"
            >
              <span>BASESCAN</span>
              <ArrowUpRight size={12} strokeWidth={2.5} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="doc-card">
      <div className="doc-card-header">
        <h3 className="doc-card-title">{item.title}</h3>
      </div>

      <div className="doc-addr-row">
        <code className="doc-addr-code">{item.address}</code>

        <div className="doc-addr-actions">
          <button
            type="button"
            onClick={handleCopy}
            className={`doc-copy-btn ${copied ? 'copied' : ''}`}
            title="Copy Address"
          >
            {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="doc-scan-btn"
            title="View on BaseScan"
          >
            <span>BaseScan</span>
            <ArrowUpRight size={13} strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ContractsPage({ isBaseAppMode = false }) {
  if (isBaseAppMode) {
    return (
      <div className="contracts-view-container">
        {/* Contracts Hero Header */}
        <div
          className="rewards-hero-header"
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            marginBottom: '22px',
            padding: '12px 8px 8px 8px'
          }}
        >
          <h2
            className="rewards-hero-title"
            style={{
              fontSize: '18px',
              margin: '0 0 12px 0',
              letterSpacing: '0.6px',
              color: '#ffffff',
              fontFamily: "'Press Start 2P', monospace",
              textAlign: 'center',
              width: '100%',
              lineHeight: 1.3
            }}
          >
            OFFICIAL <span style={{ color: '#00f5ff' }}>ADDRESSES</span>
          </h2>

          <div
            className="rewards-hero-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'rgba(0, 245, 255, 0.08)',
              border: '1.5px solid rgba(0, 245, 255, 0.35)',
              borderRadius: '99px',
              padding: '7px 16px',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 8px #00ff88', flexShrink: 0 }} />
            <span className="rewards-hero-pill-text" style={{ fontSize: '6.5px', color: '#00f5ff', letterSpacing: '0.5px', fontFamily: "'Press Start 2P', monospace", fontWeight: 800, textAlign: 'center', lineHeight: 1.4 }}>
              VERIFIED CONTRACTS · TRANSPARENCY ZONE
            </span>
          </div>
        </div>

        {/* Contract Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {CONTRACTS.map((item) => (
            <DocContractCard key={item.id} item={item} isBaseAppMode={true} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="contracts-page-section alt">
      <div className="wrap contracts-wrap">
        
        {/* Section Header styled consistently with other sections */}
        <div className="sec-head" style={{ marginBottom: '36px' }}>
          <h2>Official <span className="bl">Addresses</span>.</h2>
        </div>

        {/* Clean full-width list */}
        <div className="docs-cards-list">
          {CONTRACTS.map((item) => (
            <DocContractCard key={item.id} item={item} isBaseAppMode={false} />
          ))}
        </div>

      </div>
    </section>
  );
}
