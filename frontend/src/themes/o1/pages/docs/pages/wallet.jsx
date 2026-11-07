import { Callout, Ext, H3, N, Shot, Steps, Table, To, Ui } from '../kit';

export const wallet = [
  {
    slug: 'wallet',
    title: 'Wallet',
    lead: 'See your balances, top up and send ETH, $VIBE and USDC',
    sections: [
      {
        id: 'overview',
        title: 'What the page shows',
        body: (
          <>
            <p><To page="wallets">Both of your wallets</To> are listed with their total value in USD. Press a row to make that wallet active. Below them are the balances of the active wallet in the three supported tokens: $VIBE, ETH and USDC.</p>
            <Shot name="wallet-page" width={560} alt="The Wallet page with the total balance, both wallets, token balances and the Deposit, Send and Swap buttons" caption="The Wallet page." />
            <p>USD values use market prices from DEX Screener, with GeckoTerminal as a fallback. Treat them as estimates.</p>
          </>
        ),
      },
      {
        id: 'deposit',
        title: 'Deposit',
        body: (
          <>
            <p><Ui>Deposit</Ui> gives you two ways to add funds to the active wallet:</p>
            <ul>
              <li><strong>Send from anywhere.</strong> Copy the address and send ETH, $VIBE or USDC to it <strong>on the Base network</strong>.</li>
              <li><strong>Move from your other wallet.</strong> Choose a token and an amount, then confirm the transfer.</li>
            </ul>
            <Shot name="wallet-deposit" width={440} alt="The Deposit window with the wallet address and a form to transfer from the main wallet" caption="Depositing to the active wallet." />
            <Callout type="warn">Send only on Base. Funds sent to this address on another network will not appear in Vibe Hub.</Callout>
          </>
        ),
      },
      {
        id: 'send',
        title: 'Send',
        body: (
          <>
            <Steps>
              <li>Press <Ui>Send</Ui>.</li>
              <li>Paste the recipient address, or press <Ui>My agent wallet</Ui> or <Ui>My main wallet</Ui> to fill in your other wallet.</li>
              <li>Choose the token and enter an amount, or press <Ui>25%</Ui>, <Ui>50%</Ui> or <Ui>Max</Ui>.</li>
              <li>Press <Ui>Send</Ui> and confirm. A message under the button confirms the result.</li>
            </Steps>
            <Shot name="wallet-send" width={440} alt="The Send window with recipient, amount, token and percentage buttons" caption="Sending from the active wallet." />
            <p><Ui>Max</Ui> on ETH keeps <N>0.00002 ETH</N> in the wallet to pay for gas. The button stays off until the address is a valid Base address and the amount fits your balance, and you cannot send to the same wallet.</p>
          </>
        ),
      },
      {
        id: 'gas',
        title: 'Gas',
        body: <p>Every transaction on Base, including sending $VIBE or USDC, is paid in ETH from the sending wallet. A new Vibe Agent Wallet starts empty, so send it a little ETH before you use it.</p>,
      },
    ],
  },
  {
    slug: 'account',
    title: 'Account',
    lead: 'Your two wallets, exporting the agent wallet key, and agent access',
    sections: [
      {
        id: 'open',
        title: 'How to open it',
        body: <p>Press the wallet pill at the bottom of the menu and choose <Ui>Account</Ui>, or go to <Ext href="https://vibehome.dog/account">vibehome.dog/account</Ext>.</p>,
      },
      {
        id: 'wallets',
        title: 'Your wallets',
        body: (
          <>
            <p>The page lists both wallets with their addresses, a copy button and a link to BaseScan. The badge marks the active one. <Ui>Open wallet</Ui> takes you to the <To page="wallet">Wallet</To> page.</p>
            <Shot name="account-page" width={560} alt="The Account page with the Wallets card and the Agent access card" caption="The Account page." />
          </>
        ),
      },
      {
        id: 'export-key',
        title: 'Export the key of the agent wallet',
        body: (
          <>
            <p><Ui>Export key</Ui> shows the private key of the Vibe Agent Wallet, so you can move it to another wallet app. It appears only for the wallet created for you. The key of your main wallet stays in your own wallet app.</p>
            <Callout type="danger">Anyone with this key controls the wallet. Never share it or paste it into a chat. Your AI agent never needs it: an agent uses a separate <To page="agent-zone" hash="agent-key">agent key</To>.</Callout>
          </>
        ),
      },
      {
        id: 'agent-access',
        title: 'Agent access',
        body: <p>The <Ui>Agent access</Ui> card turns the agent on and off and manages its key. <To page="agent-zone" hash="agent-key">Agent Zone</To> explains each state.</p>,
      },
      {
        id: 'logout',
        title: 'Log out',
        body: <p>Press the wallet pill at the bottom of the menu and choose <Ui>Logout</Ui>. Your funds, streak and rewards are onchain and are there when you log back in.</p>,
      },
    ],
  },
  {
    slug: 'swap',
    title: 'Swap',
    lead: 'Exchange ETH and $VIBE inside the app at the best available route',
    sections: [
      {
        id: 'how-to',
        title: 'How to swap',
        body: (
          <>
            <Steps>
              <li>Choose the wallet with the <Ui>Swap with</Ui> switch. The swap uses that wallet's funds.</li>
              <li>Enter what you pay, or press <Ui>25%</Ui>, <Ui>50%</Ui>, <Ui>75%</Ui> or <Ui>Max</Ui>.</li>
              <li>Press the arrows between the fields to change direction between buying and selling $VIBE.</li>
              <li>Check <Ui>You receive</Ui>, then press the swap button and confirm in your wallet.</li>
            </Steps>
            <Shot name="swap-page" width={480} alt="The Swap page with the wallet switch, the amounts, slippage and routing details" caption="Buying $VIBE with ETH." />
          </>
        ),
      },
      {
        id: 'selling',
        title: 'Selling takes two steps',
        body: <p>When you sell $VIBE for the first time, the wallet asks you to approve the router first and then to confirm the swap. The approval covers exactly the amount you are selling. The form shows <Ui>Step 1/2</Ui> and <Ui>Step 2/2</Ui> as you go.</p>,
      },
      {
        id: 'routing',
        title: 'How the price is found',
        body: (
          <>
            <p>The app asks two routing engines, <strong>KyberSwap</strong> and <strong>LI.FI</strong>, and takes whichever gives you more tokens. LI.FI adds a <N>0.25%</N> fee, so KyberSwap usually wins. The engine used appears under <Ui>Routing engine</Ui>.</p>
            <p>A quote older than <N>30</N> seconds is fetched again before the swap, so you do not trade on a stale price.</p>
          </>
        ),
      },
      {
        id: 'slippage',
        title: 'Slippage',
        body: (
          <>
            <p>Slippage is how far the price may move against you before the swap cancels itself. Choose <N>0.5%</N>, <N>1%</N> (the default) or <N>3%</N>. If the price moves further, the transaction reverts, nothing is swapped, and you pay only the gas.</p>
            <H3 id="max">About Max</H3>
            <p>When you buy with <Ui>Max</Ui>, the app leaves <N>0.0001 ETH</N> in the wallet for gas.</p>
          </>
        ),
      },
      {
        id: 'button-states',
        title: 'What the button is telling you',
        body: (
          <Table
            columns={['Button says', 'Meaning']}
            rows={[
              ['Enter an amount', 'The field is empty'],
              ['Insufficient ETH or Insufficient $VIBE', 'The active wallet does not have enough. Lower the amount or switch wallet'],
              ['Finding the best price…', 'Quotes are on the way'],
              ['No swap route right now, try another amount', 'Neither engine returned a route for this amount'],
              ['Processing swap...', 'Your swap is in progress. The result and a BaseScan link appear above the button'],
            ]}
          />
        ),
      },
      {
        id: 'elsewhere',
        title: 'Trading elsewhere',
        body: <p>$VIBE also trades directly on o1 Exchange. The <Ui>DEX</Ui> group in the menu links to O1 Exchange, Dexscreener and GeckoTerminal for charts and pool data.</p>,
      },
    ],
  },
];
