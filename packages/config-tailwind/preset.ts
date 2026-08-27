/**
 * @fileoverview Shared Tailwind preset stub for SN Editor.
 * // STUB: phase-1 — brand tokens wired when apps/web design system lands
 */

/** Minimal preset object consumed by Tailwind v4 / v3 configs. */
export const snEditorTailwindPreset = {
  theme: {
    extend: {
      colors: {
        snEditor: {
          accent: 'var(--sn-editor-accent, #0f766e)',
          surface: 'var(--sn-editor-surface, #f8fafc)',
          border: 'var(--sn-editor-border, #e2e8f0)',
        },
      },
      fontFamily: {
        sans: ['var(--sn-editor-font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
};

export default snEditorTailwindPreset;
