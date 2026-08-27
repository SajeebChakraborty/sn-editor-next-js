/**
 * @fileoverview Minimal shared Button primitive for SN Editor web UI.
 * // STUB: phase-1 — expand into full design system once brand tokens land in apps/web
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}

/**
 * Shared button with variant styles via inline tokens (Tailwind classes arrive later).
 */
export function Button({
  children,
  variant = 'primary',
  type = 'button',
  style,
  ...rest
}: ButtonProps) {
  const backgrounds: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'var(--sn-editor-accent, #0f766e)',
    secondary: 'var(--sn-editor-surface, #e2e8f0)',
    ghost: 'transparent',
  };

  return (
    <button
      type={type}
      style={{
        background: backgrounds[variant],
        color: variant === 'primary' ? '#fff' : 'inherit',
        border: variant === 'ghost' ? '1px solid transparent' : '1px solid transparent',
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
        cursor: rest.disabled ? 'not-allowed' : 'pointer',
        opacity: rest.disabled ? 0.6 : 1,
        font: 'inherit',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
