/**
 * Soft brand reveal for the hero wordmark (types once, then holds).
 */
'use client';

import { useEffect, useState } from 'react';

export function TypeSnEditor({
  text = 'SN Editor',
  className = '',
}: {
  text?: string;
  className?: string;
}) {
  const [count, setCount] = useState(0);
  const [blink, setBlink] = useState(true);
  const done = count >= text.length;

  useEffect(() => {
    setCount(0);
  }, [text]);

  useEffect(() => {
    if (done) return;
    const t = window.setTimeout(() => setCount((c) => c + 1), 95);
    return () => window.clearTimeout(t);
  }, [count, done, text.length]);

  useEffect(() => {
    if (done) {
      setBlink(false);
      return;
    }
    const id = window.setInterval(() => setBlink((b) => !b), 530);
    return () => window.clearInterval(id);
  }, [done]);

  return (
    <h1 className={className} aria-label={text}>
      <span>{text.slice(0, count)}</span>
      {!done && (
        <span className="type-cursor" style={{ opacity: blink ? 1 : 0 }} aria-hidden>
          |
        </span>
      )}
    </h1>
  );
}
