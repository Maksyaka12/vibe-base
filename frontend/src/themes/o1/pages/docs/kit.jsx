import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Copy, Info, TriangleAlert, Lightbulb, ShieldAlert } from 'lucide-react';
import { Alert } from '../../components/ui';
import { getTheme } from '../../../../theme';
import shotSizes from './shotSizes.json';

// Building blocks of the /docs pages. Styles: styles/o1-docs.css.

/** A number, amount, address or date inside a sentence (DESIGN.md: numbers are mono). */
export const N = ({ children }) => <span className="mono o1-docs-n">{children}</span>;

/** A name of a control or a page as it reads in the app. */
export const Ui = ({ children }) => <span className="o1-docs-ui">{children}</span>;

export const C = ({ children }) => <code className="o1-docs-inline-code">{children}</code>;

export const Ext = ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;

export const To = ({ page, hash, children }) => <Link to={`/docs${page ? `/${page}` : ''}${hash ? `#${hash}` : ''}`}>{children}</Link>;

export const H3 = ({ id, children }) => <h3 id={id} className="o1-docs-h3">{children}</h3>;

const CALLOUT = {
  note: { tone: 'info', Icon: Info },
  tip: { tone: 'success', Icon: Lightbulb },
  warn: { tone: 'warn', Icon: TriangleAlert },
  danger: { tone: 'danger', Icon: ShieldAlert },
};

export function Callout({ type = 'note', children }) {
  const { tone, Icon } = CALLOUT[type];
  return <Alert tone={tone} icon={<Icon size={16} />} className="o1-docs-callout">{children}</Alert>;
}

/** Numbered how-to steps. */
export function Steps({ children }) {
  return <ol className="o1-docs-steps">{children}</ol>;
}

/** A screenshot of the app in the current theme. `width` caps the shown size of small crops. */
export function Shot({ name, alt, caption, width }) {
  const src = `/docs-media/${getTheme()}/${name}.webp`;
  const size = shotSizes[name];
  const shown = width || (size ? Math.min(size[0] / 2, 760) : undefined);
  return (
    <figure className="o1-docs-figure">
      <a href={src} target="_blank" rel="noopener noreferrer" className="o1-docs-figure-frame" style={shown ? { maxWidth: shown } : undefined}>
        <img src={src} alt={alt} width={size?.[0]} height={size?.[1]} loading="lazy" />
      </a>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/** Two or three narrow screenshots side by side (one column on phones). */
export function ShotRow({ children }) {
  return <div className="o1-docs-shot-row">{children}</div>;
}

/** columns: header strings; `mono`: indexes of the columns that hold numbers, dates or addresses; `nowrap`: columns kept on one line. */
export function Table({ columns, rows, mono = [], nowrap = [] }) {
  return (
    <div className="o1-docs-table-wrap">
      <table className="o1-docs-table">
        <thead>
          <tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => <td key={j} className={[mono.includes(j) && 'mono', nowrap.includes(j) && 'nowrap'].filter(Boolean).join(' ') || undefined}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Code({ title, children }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };
  return (
    <div className="o1-docs-code">
      <div className="o1-docs-code-head">
        <span>{title}</span>
        <button type="button" onClick={copy} aria-label="Copy code" title="Copy">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="mono"><code>{children}</code></pre>
    </div>
  );
}

/** The life of a reward round, drawn from the same three moments the contracts enforce. */
export function RoundTimeline() {
  const stages = [
    { at: '00:00 UTC, round day', title: 'Snapshot', text: 'Balances and NFT holders are recorded. What you hold after this moment no longer counts for this round.' },
    { at: '14:00 UTC, same day', title: 'Claim opens', text: 'The allocations are published. Eligible wallets can claim from the Claim Portal.', live: true },
    { at: '00:00 UTC, next snapshot day', title: 'Claim closes', text: 'The round expires. Nobody can claim it any more, not even by calling the contract directly.', end: true },
  ];
  return (
    <ol className="o1-docs-timeline">
      {stages.map((s) => (
        <li key={s.title} className={`${s.live ? 'live' : ''} ${s.end ? 'end' : ''}`.trim() || undefined}>
          <span className="o1-docs-timeline-dot" aria-hidden="true" />
          <span className="mono o1-docs-timeline-at">{s.at}</span>
          <span className="o1-docs-timeline-title">{s.title}</span>
          <span className="o1-docs-timeline-text">{s.text}</span>
        </li>
      ))}
    </ol>
  );
}

/** A 100% bar of shares. parts: [{ label, value, strong }] */
export function ShareBar({ parts }) {
  return (
    <div className="o1-docs-share">
      <div className="o1-docs-share-bar" aria-hidden="true">
        {parts.map((p) => <span key={p.label} className={p.strong ? 'strong' : undefined} style={{ flexGrow: p.value }} />)}
      </div>
      <ul>
        {parts.map((p) => (
          <li key={p.label}>
            <i className={p.strong ? 'strong' : undefined} aria-hidden="true" />
            <span>{p.label}</span>
            <span className="mono">{p.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Faq({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="o1-faq-card o1-docs-faq">
      {items.map(({ q, a }) => {
        const isOpen = open === q;
        return (
          <div key={q} className="o1-faq-item">
            <button type="button" className="o1-faq-trigger" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : q)}>
              <span>{q}</span>
              <ChevronDown size={15} className={isOpen ? 'o1-docs-chevron open' : 'o1-docs-chevron'} />
            </button>
            {isOpen && <div className="o1-faq-content">{a}</div>}
          </div>
        );
      })}
    </div>
  );
}

/** Link cards. items: [{ page, title, text, icon }] */
export function CardGrid({ items }) {
  return (
    <div className="o1-docs-cards">
      {items.map(({ page, title, text, icon: Icon }) => (
        <Link key={page} to={`/docs/${page}`} className="o1-docs-card">
          {Icon && <span className="o1-docs-card-icon"><Icon size={18} strokeWidth={1.75} /></span>}
          <b>{title}</b>
          <span>{text}</span>
        </Link>
      ))}
    </div>
  );
}
