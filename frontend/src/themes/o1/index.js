// App is imported before the global stylesheets on purpose: it keeps the same CSS
// order as the original entry (component CSS first, then index.css and o1-*.css).
import App from './App.jsx';
import './index.css';
import './styles/o1-tokens.css';
import './styles/o1-components.css';
import './styles/o1-profile.css';
import './styles/o1-hub.css';
import './styles/o1-claim.css';
import './styles/o1-swap.css';
import './styles/o1-nft.css';
import './styles/o1-tokenomics.css';
import './styles/o1-contracts.css';
import './styles/o1-admin.css';

export default App;
