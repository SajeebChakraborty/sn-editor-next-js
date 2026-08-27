/**
 * Shared drag payload for Effect / Transition / Filter → timeline clips.
 * Uses a module payload in addition to DataTransfer — custom MIME types are
 * unreliable across browsers during dragover.
 */
export const SN_EDITOR_FX_MIME = 'application/x-sn-editor-fx';

export type FxDragKind = 'effect' | 'transition' | 'filter';

export type FxDragPayload = {
  kind: FxDragKind;
  id: string;
  label?: string;
};

let activePayload: FxDragPayload | null = null;

export function beginFxDrag(payload: FxDragPayload) {
  activePayload = payload;
}

export function peekFxDrag(): FxDragPayload | null {
  return activePayload;
}

export function endFxDrag() {
  activePayload = null;
}

export function encodeFxDrag(payload: FxDragPayload): string {
  return JSON.stringify(payload);
}

export function parseFxDrag(raw: string | undefined | null): FxDragPayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as FxDragPayload;
    if (!data?.kind || !data?.id) return null;
    if (data.kind !== 'effect' && data.kind !== 'transition' && data.kind !== 'filter') {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setFxDragData(dt: DataTransfer, payload: FxDragPayload) {
  beginFxDrag(payload);
  const encoded = encodeFxDrag(payload);
  try {
    dt.setData(SN_EDITOR_FX_MIME, encoded);
  } catch {
    /* some browsers reject custom MIME */
  }
  dt.setData('text/plain', encoded);
  dt.effectAllowed = 'copy';
}

export function readFxDragData(dt: DataTransfer): FxDragPayload | null {
  const fromMime = parseFxDrag(dt.getData(SN_EDITOR_FX_MIME));
  if (fromMime) return fromMime;
  const fromText = parseFxDrag(dt.getData('text/plain'));
  if (fromText) return fromText;
  return peekFxDrag();
}

export function isFxDragEvent(dt: DataTransfer): boolean {
  if (peekFxDrag()) return true;
  const types = Array.from(dt.types ?? []);
  return (
    types.includes(SN_EDITOR_FX_MIME) ||
    types.includes('text/plain') ||
    types.includes('Text')
  );
}
