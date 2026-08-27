'use client';

import dynamic from 'next/dynamic';

const VideoEditorShell = dynamic(
  () =>
    import('@/components/video-editor/VideoEditorShell').then((m) => m.VideoEditorShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[var(--sn-editor-canvas,#f4f7f8)] text-sm text-ink-600">
        Loading video editor…
      </div>
    ),
  },
);

export default function VideoPage() {
  return <VideoEditorShell />;
}
