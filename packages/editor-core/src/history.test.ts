import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyDocument, createLayer } from './document';
import { canRedo, canUndo, createHistory, pushHistory, redo, undo } from './history';
import { setLayerVisibility, addLayer, arrangeLayer, updateLayerTransform } from './commands';

describe('history', () => {
  it('supports undo and redo', () => {
    let doc = createEmptyDocument();
    let hist = createHistory(doc);
    doc = addLayer(doc, createLayer({ type: 'shape', name: 'Rect', shape: 'rect' }));
    hist = pushHistory(hist, doc);
    doc = setLayerVisibility(doc, doc.layers[0]!.id, false);
    hist = pushHistory(hist, doc);

    assert.equal(canUndo(hist), true);
    hist = undo(hist);
    assert.equal(hist.present.layers[0]!.visible, true);
    assert.equal(canRedo(hist), true);
    hist = redo(hist);
    assert.equal(hist.present.layers[0]!.visible, false);
  });
});

describe('layer position and stack', () => {
  it('updates transform x/y/width/height', () => {
    let doc = createEmptyDocument();
    doc = addLayer(doc, createLayer({ type: 'shape', name: 'Rect', shape: 'rect' }));
    const id = doc.layers[0]!.id;
    doc = updateLayerTransform(doc, id, { x: 120, y: 40, width: 300, height: 180, rotation: 15 });
    assert.equal(doc.layers[0]!.transform.x, 120);
    assert.equal(doc.layers[0]!.transform.y, 40);
    assert.equal(doc.layers[0]!.transform.width, 300);
    assert.equal(doc.layers[0]!.transform.height, 180);
    assert.equal(doc.layers[0]!.transform.rotation, 15);
  });

  it('moves a layer to front and back among siblings', () => {
    let doc = createEmptyDocument();
    doc = addLayer(doc, createLayer({ type: 'shape', name: 'A', shape: 'rect' }));
    doc = addLayer(doc, createLayer({ type: 'shape', name: 'B', shape: 'rect' }));
    doc = addLayer(doc, createLayer({ type: 'image', name: 'C' }));
    const ids = doc.layers.map((l) => l.id);
    doc = arrangeLayer(doc, ids[0]!, 'front', ids);
    assert.equal(doc.layers[2]!.name, 'A');
    doc = arrangeLayer(doc, ids[0]!, 'back', doc.layers.map((l) => l.id));
    assert.equal(doc.layers[0]!.name, 'A');
    doc = arrangeLayer(doc, ids[0]!, 'forward', doc.layers.map((l) => l.id));
    assert.equal(doc.layers[1]!.name, 'A');
  });
});
