'use client';

import dynamic from 'next/dynamic';

export const LiveTutorialLazy = dynamic(
  () => import('./LiveTutorial').then((m) => m.LiveTutorial),
  {
    ssr: false,
    loading: () => (
      <div className="live-tut">
        <div className="live-tut-copy">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">
            Live tutorial
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink-950 sm:text-4xl">
            Watch a post come together
          </h2>
          <p className="mt-3 text-ink-700">Loading interactive canvas…</p>
        </div>
        <div className="live-tut-stage-wrap">
          <div className="live-tut-frame">
            <div className="live-tut-canvas" style={{ minHeight: 360 }} />
          </div>
        </div>
      </div>
    ),
  },
);
