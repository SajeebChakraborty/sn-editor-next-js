/**
 * @fileoverview Panel container for sidebars / inspector chrome.
 * // STUB: phase-1 — replace inline styles with design-system tokens
 */

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
}

/**
 * Simple titled panel used by editor chrome stubs.
 */
export function Panel({ children, title, style, ...rest }: PanelProps) {
  const panelStyle: CSSProperties = {
    background: 'var(--sn-editor-panel, #f8fafc)',
    border: '1px solid var(--sn-editor-border, #e2e8f0)',
    borderRadius: '0.5rem',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    ...style,
  };

  return (
    <div style={panelStyle} {...rest}>
      {title ? (
        <h2 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{title}</h2>
      ) : null}
      {children}
    </div>
  );
}
