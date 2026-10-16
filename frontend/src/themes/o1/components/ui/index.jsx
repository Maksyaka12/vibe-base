import React from 'react';

/**
 * Button component per o1-dark-ui-design §5.1
 * variant: 'primary' | 'secondary' | 'ghost'
 * size: 'sm' | 'md' | 'lg'
 */
export function Button({
  as: Component = 'button',
  children,
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled = false,
  ...props
}) {
  const sizeCls = size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : '';
  const varCls = `btn-${variant}`;
  const fullCls = fullWidth ? 'btn-full' : '';
  return (
    <Component
      className={`btn ${varCls} ${sizeCls} ${fullCls} ${className}`.trim()}
      disabled={Component === 'button' ? disabled : undefined}
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Card container per o1-dark-ui-design §4
 */
export function Card({ children, hover = false, className = '', style, ...props }) {
  return (
    <div
      className={`card ${hover ? 'card-hover' : ''} ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * KPI / Metric Tile per o1-dark-ui-design §5.4
 */
export function Tile({
  label,
  value,
  sub,
  icon,
  className = '',
  style,
  children,
  ...props
}) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && (icon.$$typeof || icon.render))) {
      const IconComp = icon;
      return <IconComp size={14} />;
    }
    return icon;
  };

  return (
    <div className={`tile ${className}`.trim()} style={style} {...props}>
      {label && (
        <div className="tile-label">
          <span>{label}</span>
          {renderIcon()}
        </div>
      )}
      {value !== undefined && <div className="tile-value">{value}</div>}
      {sub && <div className="tile-sub">{sub}</div>}
      {children}
    </div>
  );
}


/**
 * Badge & Status Pill per o1-dark-ui-design §5.9
 * tone: 'neutral' | 'accent' | 'success' | 'warn' | 'danger'
 * pill: boolean
 */
export function Badge({
  children,
  tone = 'neutral',
  pill = false,
  className = '',
  style,
  ...props
}) {
  const toneCls = `badge-${tone}`;
  const pillCls = pill ? 'badge-pill' : '';
  return (
    <span
      className={`badge ${toneCls} ${pillCls} ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status, tone, children, ...props }) {
  // auto-derive tone from status if not provided
  let derivedTone = tone;
  if (!derivedTone && status) {
    const s = String(status).toLowerCase();
    if (s.includes('live') || s.includes('unlocked') || s.includes('active') || s.includes('eligible')) derivedTone = 'success';
    else if (s.includes('pre') || s.includes('info') || s.includes('new')) derivedTone = 'accent';
    else if (s.includes('warn') || s.includes('tax')) derivedTone = 'warn';
    else if (s.includes('forbid') || s.includes('danger') || s.includes('not eligible') || s.includes('ended')) derivedTone = 'danger';
    else derivedTone = 'neutral';
  }
  return (
    <Badge pill tone={derivedTone || 'neutral'} {...props}>
      {children || status}
    </Badge>
  );
}

/**
 * PageHeader per o1-dark-ui-design §2 & vibe-hub-redesign §4.3
 * Left-aligned, factual, calm.
 */
export function PageHeader({ title, description, badge, action, className = '', style }) {
  return (
    <header className={`page-header ${className}`.trim()} style={style}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-desc">{description}</p>}
        </div>
        {(badge || action) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {badge}
            {action}
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * SectionTitle per vibe-hub-redesign §4.3
 */
export function SectionTitle({ title, count, right, className = '', style }) {
  return (
    <div className={`section-title ${className}`.trim()} style={style}>
      <div className="section-title-left">
        <span>{title}</span>
        {count !== undefined && <span className="section-count">({count})</span>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

/**
 * Alert banner per o1-dark-ui-design §5.16
 * tone: 'info' | 'warn' | 'success' | 'danger'
 */
export function Alert({ children, tone = 'warn', icon, action, className = '', style }) {
  return (
    <div className={`alert alert-${tone} ${className}`.trim()} style={style}>
      {icon && <div style={{ flexShrink: 0, marginTop: '1px' }}>{icon}</div>}
      <div style={{ flex: 1 }}>{children}</div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

/**
 * Progress Bar per o1-dark-ui-design §4
 */
export function ProgressBar({ value = 0, max = 100, className = '', style }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`progress-bar-track ${className}`.trim()} style={style}>
      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Key-Value Row
 */
export function KeyValue({ label, value, sub, right, className = '', style }) {
  return (
    <div className={`kv-row ${className}`.trim()} style={style}>
      <div className="kv-label">{label}</div>
      <div style={{ textAlign: 'right' }}>
        <div className="kv-value">{value}</div>
        {sub && <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{sub}</div>}
        {right}
      </div>
    </div>
  );
}

/**
 * EmptyState per o1-dark-ui-design §5.16
 */
export function EmptyState({ icon, title, description, action, className = '', style }) {
  return (
    <div className={`empty-state ${className}`.trim()} style={style}>
      {icon}
      {title && <div className="empty-state-title">{title}</div>}
      {description && <div className="empty-state-desc">{description}</div>}
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  );
}
