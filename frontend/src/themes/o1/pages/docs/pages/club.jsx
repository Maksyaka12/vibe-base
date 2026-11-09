import { C, Callout, Ext, H3, N, ShareBar, Shot, Steps, Table, To, Ui } from '../kit';

export const club = [
  {
    slug: 'vibe-club-nft',
    title: 'Vibe Club NFT',
    lead: 'A genesis collection of 333 membership passes that earn royalties every 10 days',
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        body: (
          <>
            <Table
              columns={['', 'Details']}
              rows={[
                ['Supply', <><N>333</N> NFTs</>],
                ['Wallet limit', <><N>1</N> mint per wallet</>],
                ['Mint price', <><N>0.005 ETH</N>, or the same value in $VIBE at the market price</>],
                ['Network', 'Base'],
                ['Secondary market', <Ext href="https://opensea.io/collection/vibeclubnft">OpenSea</Ext>],
              ]}
            />
            <Shot name="nft-mint" alt="The mint page with the NFT preview, prices, wallet limit, progress, burn total and mint buttons" caption="The mint page reads the price, the number minted and the burn total live." />
          </>
        ),
      },
      {
        id: 'mint',
        title: 'How to mint',
        body: (
          <>
            <Steps>
              <li>Open <Ext href="https://vibehome.dog/vibeclub">Vibe Club NFT</Ext> and <To page="wallets" hash="switching">select the wallet</To> that should hold the pass.</li>
              <li>Check your balances under the mint details: you need the price plus a little ETH for gas.</li>
              <li>Press <Ui>Mint for ... ETH</Ui> or <Ui>Mint for ... $VIBE</Ui>.</li>
              <li>Confirm in your wallet. Minting with $VIBE first asks you to approve the token, so it takes two confirmations.</li>
            </Steps>
            <p>Your NFT is assigned at mint, and the mint card then shows which one you got.</p>
            <Callout type="warn">Mint only on the official page at vibehome.dog. The contract is <C>0x9E92307Dbec2d0aE4BBF14cA93E1cA00edC4b886</C>.</Callout>
          </>
        ),
      },
      {
        id: 'after-mint',
        title: 'After you mint',
        body: (
          <>
            <p>A card with your NFT appears, and you can save the image or share it on X. If you come back later, the page shows <Ui>You have minted (1/1 max)</Ui> and <Ui>View mint card &amp; share</Ui> brings the card back.</p>
            <Shot name="nft-card" width={400} alt="The mint card with the NFT, its number and the Save image and Share on X buttons" />
            <Shot name="nft-minted" width={520} alt="The page after minting with View mint card and OpenSea buttons" />
          </>
        ),
      },
      {
        id: 'benefits',
        title: 'What it gives you',
        body: (
          <>
            <Shot name="nft-perks" alt="Three cards: lifetime royalties, mint burn mechanism and secondary market" />
            <ul>
              <li><strong>Royalties.</strong> Hold the NFT at the snapshot to share each <To page="vibe-club-royalties">royalty pool</To>, every <N>10</N> days.</li>
              <li><strong>Profile identity.</strong> Your NFT becomes your <To page="profile" hash="identity">identity card</To>.</li>
              <li><strong>Trade it.</strong> The collection trades on OpenSea. Royalties go to whichever wallet holds it at the snapshot.</li>
            </ul>
          </>
        ),
      },
      {
        id: 'mint-economics',
        title: 'Where the mint money goes',
        body: (
          <>
            <ShareBar parts={[{ label: 'Bought and burned $VIBE', value: 80, strong: true }, { label: 'Community rewards pool', value: 20 }]} />
            <p><N>80%</N> of the mint revenue buys $VIBE and burns it permanently. The rest goes into the community rewards pool. <Ui>Total burned by mint</Ui> on the page reads the onchain total. More in <To page="tokenomics" hash="mint-economy">Tokenomics</To>.</p>
          </>
        ),
      },
      {
        id: 'agents',
        title: 'Minting with an agent',
        body: (
          <>
            <p>An <To page="agent-zone">agent</To> can mint one NFT from the Vibe Agent Wallet, with ETH at the contract price. The agent has to confirm the price with you first, and you can turn this off in <To page="agent-settings">Settings</To>.</p>
            <H3 id="vibe-mint">Minting with $VIBE</H3>
            <p>Minting with $VIBE is available only by hand on the site. Agents mint with ETH.</p>
          </>
        ),
      },
    ],
  },
];
