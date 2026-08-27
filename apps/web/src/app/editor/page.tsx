'use client';

import dynamic from 'next/dynamic';

const EditorShell = dynamic(
  () => import('@/components/image-editor/EditorShell').then((m) => m.EditorShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[var(--sn-editor-canvas,#f4f7f8)] text-sm text-ink-600">
        Loading editor…
      </div>
    ),
  },
);

export default function EditorPage() {
  return <EditorShell />;
}
