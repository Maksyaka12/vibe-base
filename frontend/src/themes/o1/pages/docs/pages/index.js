import { start } from './start';
import { wallet } from './wallet';
import { rewards } from './rewards';
import { profile } from './profile';
import { club } from './club';
import { agents } from './agents';
import { vibe } from './vibe';
import { help } from './help';

// The docs menu, in order. Each file holds the pages of one group.
export const DOC_GROUPS = [
  { title: 'Get started', pages: start },
  { title: 'Wallet and swap', pages: wallet },
  { title: 'Rewards', pages: rewards },
  { title: 'Profile', pages: profile },
  { title: 'Vibe Club', pages: club },
  { title: 'Agents', pages: agents },
  { title: '$VIBE', pages: vibe },
  { title: 'Help', pages: help },
];

export const DOC_PAGES = DOC_GROUPS.flatMap((group) => group.pages);
