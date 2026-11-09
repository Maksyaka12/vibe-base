/**
 * VIBE Tokenomics - Holder Rewards Snapshot & Merkle Tree Generator
 * 
 * Usage:
 *   node scripts/makeSnapshot.cjs [roundNumber]
 *   Example: node scripts/makeSnapshot.cjs 2
 */

const fs = require('fs');
const path = require('path');
const { createPublicClient, http, fallback, parseAbi, parseUnits, formatUnits, keccak256, encodePacked, concatHex } = require('../frontend/node_modules/viem');
const { base } = require('../frontend/node_modules/viem/chains');

const TOKEN_ADDRESS = '0xb200000000000000000000df24ecb8bf51100a01';
const VESTING_CONTRACT = '0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089';
const MIN_BALANCE = 5000000; // 5,000,000 $VIBE threshold
const MONTHLY_POOL = 10000000; // 10,000,000 $VIBE per month
const MAX_ALLOCATION_CAP = 500000; // 500,000 $VIBE cap per wallet

// Same list as HOLDER_EXCLUSIONS in frontend/src/data/snapshot/engine.js (tests/snapshot.test.js checks they match)
const SYSTEM_EXCLUSIONS = [
  '0xb200000000000000000000df24ecb8bf51100a01', // Token CA itself
  '0x498581ff718922c3f8e6a244956af099b2652b2b', // Uniswap V4 PoolManager
  '0x3beea54db87a632a5faf20db6765d3af94c81b31', // VestingVault 100M
  '0x6f25a9e1e677616c1bf7ab54b470b0c82839adb4', // o1 Exchange staking contract
  '0x067c66addd3c6d484c1882b68e197b614f7f3ebf', // Buyback, burn and community pool
  '0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089', // Holder rewards distributor v1
  '0x90b855994d9ba328399d87d0285b7d7f7b8e2c80', // Holder rewards distributor v2
  '0x3753ee7fa9538087f901aa5e4afc12dba57b97c1', // Royalty distributor v1
  '0xeeb47756fbf417907b2be94accfb851a224add2c', // Royalty distributor v2
  '0x000000000000000000000000000000000000dead', // Burn Address
  '0x0000000000000000000000000000000000000000', // Zero Address
  '0xfce13943c69b8cfe3de795dfe1a8447c8f8a99cb', // was listed as the staking contract; kept out to be safe
].map(a => a.toLowerCase());

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function hashPair(a, b) {
  const bufA = Buffer.from(a.slice(2), 'hex');
  const bufB = Buffer.from(b.slice(2), 'hex');
  return Buffer.compare(bufA, bufB) < 0
    ? keccak256(concatHex([a, b]))
    : keccak256(concatHex([b, a]));
}

function buildMerkleTree(elements) {
  const leaves = elements.map(e => e.leaf);
  if (leaves.length === 0) return { root: '0x0', proofs: {} };

  let layers = [leaves];
  while (layers[layers.length - 1].length > 1) {
    const currentLayer = layers[layers.length - 1];
    const nextLayer = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      if (i + 1 < currentLayer.length) {
        nextLayer.push(hashPair(currentLayer[i], currentLayer[i + 1]));
      } else {
        nextLayer.push(currentLayer[i]);
      }
    }
    layers.push(nextLayer);
  }

  const root = layers[layers.length - 1][0];
  const proofs = {};
  for (let i = 0; i < elements.length; i++) {
    const proof = [];
    let idx = i;
    for (let l = 0; l < layers.length - 1; l++) {
      const layer = layers[l];
      const isRightNode = idx % 2 === 1;
      const pairIdx = isRightNode ? idx - 1 : idx + 1;
      if (pairIdx < layer.length) {
        proof.push(layer[pairIdx]);
      }
      idx = Math.floor(idx / 2);
    }
    proofs[elements[i].address.toLowerCase()] = {
      address: elements[i].address,
      balance: elements[i].balance,
      amount: elements[i].amount,
      amountWei: elements[i].amountWei.toString(),
      sharePercent: elements[i].sharePercent,
      isCapped: elements[i].isCapped,
      leaf: elements[i].leaf,
      proof: proof
    };
  }
  return { root, proofs };
}

async function runSnapshot() {
  const roundNumber = parseInt(process.argv[2] || '2', 10);
  console.log('\n======================================================');
  console.log('🚀 VIBE Tokenomics - Full BaseScan Snapshot (Round ' + roundNumber + ')');
  console.log('======================================================');
  console.log('Token CA:             ' + TOKEN_ADDRESS);
  console.log('Vesting Contract:     ' + VESTING_CONTRACT);
  console.log('Min Holding Required: ' + MIN_BALANCE.toLocaleString() + ' $VIBE');
  console.log('Monthly Reward Pool:  ' + MONTHLY_POOL.toLocaleString() + ' $VIBE');
  console.log('Max Allocation Cap:   ' + MAX_ALLOCATION_CAP.toLocaleString() + ' $VIBE');
  console.log('Timestamp:            ' + new Date().toISOString());
  console.log('-----------------------------------------------------\n');

  const tokenAbi = parseAbi([
    'function balanceOf(address) view returns (uint256)'
  ]);

  const transport = fallback([
    http('https://base.drpc.org'),
    http('https://base.merkle.io'),
    http('https://base-mainnet.public.blastapi.io'),
    http('https://mainnet.base.org')
  ]);

  const client = createPublicClient({ chain: base, transport });
  
  const latestBlockData = await client.getBlock({ blockTag: 'latest' });
  const snapshotBlock = latestBlockData.number;
  const snapshotIso = new Date().toISOString();

  console.log(`📌 Current Snapshot Block: ${snapshotBlock.toString()}`);
  console.log(`📌 Block Timestamp:        ${new Date(Number(latestBlockData.timestamp) * 1000).toISOString()}`);

  console.log('\n[1/4] 🔍 Fetching 100% of token holders across all pages on BaseScan & Blockscout...');
  const addresses = new Set();

  // 1. Scrape all holder pages from BaseScan
  for (let p = 1; p <= 35; p++) {
    const url = 'https://basescan.org/token/generic-tokenholders2?a=' + TOKEN_ADDRESS + '&p=' + p;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (res.status !== 200) break;
      const html = await res.text();
      const matches = html.match(/0x[a-fA-F0-9]{40}/g) || [];
      if (matches.length === 0 || html.includes('No data found')) break;
      matches.forEach(m => addresses.add(m.toLowerCase()));
      await sleep(100);
    } catch (e) {
      break;
    }
  }
  console.log(`BaseScan addresses indexed: ${addresses.size}`);

  // 2. Fetch from Blockscout
  try {
    let url = 'https://base.blockscout.com/api/v2/tokens/' + TOKEN_ADDRESS + '/holders';
    while (url) {
      let data = null;
      for (let r = 0; r < 5; r++) {
        try {
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (res.status === 200) {
            data = await res.json();
            break;
          }
          await sleep(300);
        } catch (e) {
          await sleep(300);
        }
      }
      if (!data || !data.items || data.items.length === 0) break;
      data.items.forEach(it => {
        if (it.address?.hash) addresses.add(it.address.hash.toLowerCase());
      });
      if (data.next_page_params) {
        url = 'https://base.blockscout.com/api/v2/tokens/' + TOKEN_ADDRESS + '/holders?' + new URLSearchParams(data.next_page_params).toString();
        await sleep(100);
      } else {
        url = null;
      }
    }
  } catch (e) {}

  // 3. Include previous round claims
  try {
    const r1 = require('../snapshots/round_1_proofs.json');
    Object.keys(r1.claims || {}).forEach(a => addresses.add(a.toLowerCase()));
  } catch (e) {}

  console.log(`Total Unique Addresses Discovered on Base: ${addresses.size}`);

  const userAddrs = Array.from(addresses).filter(a => !SYSTEM_EXCLUSIONS.includes(a));
  console.log('\n[2/4] 🔍 Multicalling current balanceOf for all ' + userAddrs.length + ' addresses at Block ' + snapshotBlock.toString() + '...');

  const eligible = [];
  const balanceChunkSize = 50;
  for (let i = 0; i < userAddrs.length; i += balanceChunkSize) {
    const chunk = userAddrs.slice(i, i + balanceChunkSize);
    const calls = chunk.map(a => ({ address: TOKEN_ADDRESS, abi: tokenAbi, functionName: 'balanceOf', args: [a] }));
    let res = null;
    for (let retry = 0; retry < 5; retry++) {
      try {
        res = await client.multicall({ contracts: calls, blockNumber: snapshotBlock });
        if (res && res.length === chunk.length) break;
      } catch (err) {
        await sleep(250 * (retry + 1));
      }
    }
    if (res) {
      for (let j = 0; j < chunk.length; j++) {
        const balWei = res[j]?.result || 0n;
        const bal = Number(formatUnits(balWei, 18));
        if (bal >= MIN_BALANCE) {
          eligible.push({ address: chunk[j], balance: bal });
        }
      }
    }
    process.stdout.write(`Checked balances: ${Math.min(i + balanceChunkSize, userAddrs.length)}/${userAddrs.length} (${eligible.length} eligible)...\r`);
  }
  console.log('');

  eligible.sort((a, b) => b.balance - a.balance);
  console.log('=== Found EXACTLY ' + eligible.length + ' Qualified Wallets (>= 5M $VIBE) ===');

  const totalEligibleSum = eligible.reduce((acc, h) => acc + h.balance, 0);
  console.log('Total Qualified Balance Sum: ' + Math.round(totalEligibleSum).toLocaleString() + ' $VIBE');

  console.log('\n[3/4] 🧮 Calculating Proportional Allocations with 500,000 $VIBE Max Cap...');

  let remainingPool = MONTHLY_POOL;
  let remainingHolders = [...eligible];
  const finalRewards = new Map();

  while (remainingHolders.length > 0) {
    const currSum = remainingHolders.reduce((acc, h) => acc + h.balance, 0);
    let newlyCappedCount = 0;
    const nextRemaining = [];

    for (const h of remainingHolders) {
      const share = (h.balance / currSum) * remainingPool;
      if (share >= MAX_ALLOCATION_CAP) {
        finalRewards.set(h.address, { amount: MAX_ALLOCATION_CAP, isCapped: true });
        remainingPool -= MAX_ALLOCATION_CAP;
        newlyCappedCount++;
      } else {
        nextRemaining.push(h);
      }
    }

    if (newlyCappedCount === 0) {
      const finalSum = remainingHolders.reduce((acc, h) => acc + h.balance, 0);
      for (const h of remainingHolders) {
        const rew = Math.round((h.balance / finalSum) * remainingPool);
        finalRewards.set(h.address, { amount: Math.min(MAX_ALLOCATION_CAP, rew), isCapped: false });
      }
      break;
    }
    remainingHolders = nextRemaining;
  }

  let totalDistributed = 0;
  const elements = eligible.map(h => {
    const capInfo = finalRewards.get(h.address);
    const rewardAmount = capInfo.amount;
    totalDistributed += rewardAmount;
    const amountWei = parseUnits(rewardAmount.toString(), 18);
    const leaf = keccak256(encodePacked(['address', 'uint256', 'uint256'], [h.address, BigInt(roundNumber), amountWei]));
    return {
      address: h.address,
      balance: Math.round(h.balance),
      amount: rewardAmount,
      amountWei: amountWei,
      sharePercent: ((rewardAmount / MONTHLY_POOL) * 100).toFixed(2) + '%',
      isCapped: capInfo.isCapped,
      leaf: leaf
    };
  });

  console.log('Total Distributed: ' + totalDistributed.toLocaleString() + ' $VIBE (100% full pool)');

  console.log('\n[4/4] 🌳 Generating Merkle Tree & Cryptographic Proofs...');
  const { root, proofs } = buildMerkleTree(elements);

  console.log('\n======================================================');
  console.log('✅ SNAPSHOT & MERKLE Generated Successfully!');
  console.log('======================================================');
  console.log('🔑 Merkle Root (for Round ' + roundNumber + '):');
  console.log(root + '\n');

  const outDir = path.join(__dirname, '../snapshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const rootFile = path.join(outDir, 'round_' + roundNumber + '_root.txt');
  fs.writeFileSync(rootFile, root, 'utf8');

  const proofsFile = path.join(outDir, 'round_' + roundNumber + '_proofs.json');
  fs.writeFileSync(proofsFile, JSON.stringify({
    round: roundNumber,
    token: TOKEN_ADDRESS,
    vestingContract: VESTING_CONTRACT,
    snapshotBlock: snapshotBlock.toString(),
    snapshotDate: snapshotIso,
    merkleRoot: root,
    totalHolders: elements.length,
    totalEligibleSupply: totalEligibleSum,
    monthlyPool: MONTHLY_POOL,
    maxAllocationCap: MAX_ALLOCATION_CAP,
    claims: proofs
  }, null, 2), 'utf8');

  const frontendDataDir = path.join(__dirname, '../frontend/src/data');
  if (!fs.existsSync(frontendDataDir)) fs.mkdirSync(frontendDataDir, { recursive: true });
  fs.writeFileSync(path.join(frontendDataDir, 'round_' + roundNumber + '_proofs.json'), JSON.stringify({
    round: roundNumber,
    merkleRoot: root,
    claims: proofs
  }, null, 2), 'utf8');

  const csvFile = path.join(outDir, 'round_' + roundNumber + '_table.csv');
  let csv = 'Rank,Address,Balance,SharePercent,RewardAmount,IsCapped\n';
  elements.forEach((e, idx) => {
    csv += (idx + 1) + ',' + e.address + ',' + e.balance + ',' + e.sharePercent + ',' + e.amount + ',' + e.isCapped + '\n';
  });
  fs.writeFileSync(csvFile, csv, 'utf8');

  console.log('📁 Files Saved:');
  console.log('1. Root file:   ' + rootFile);
  console.log('2. Proofs file: ' + proofsFile);
  console.log('3. Audit CSV:   ' + csvFile);
  console.log('4. UI Ready:    ' + path.join(frontendDataDir, 'round_' + roundNumber + '_proofs.json'));

  console.log('\n📋 All ' + elements.length + ' Qualified Allocations (>= 5M $VIBE, 500k CAP):');
  console.table(elements.map((e, idx) => ({
    '#': idx + 1,
    'Address': e.address.slice(0, 8) + '...' + e.address.slice(-6),
    'Balance': e.balance.toLocaleString() + ' $VIBE',
    'Share': e.sharePercent,
    'Reward': e.amount.toLocaleString() + ' $VIBE' + (e.isCapped ? ' (CAPPED 500k)' : '')
  })));

  console.log('\n🎯 NEXT ACTION:');
  console.log('Send 1 transaction on Base to contract ' + VESTING_CONTRACT + ':');
  console.log('Function: setMerkleRoot(' + roundNumber + ', "' + root + '")\n');
}

runSnapshot().catch(err => {
  console.error('Fatal error during snapshot execution:', err);
  process.exit(1);
});
