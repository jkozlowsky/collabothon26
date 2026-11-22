import type { HostInstance } from 'react-native';

export type TileLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LineEndpoints = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

/** A pair's line runs from the middle of the left tile's right edge to the middle of the right tile's left edge. */
export function computeLineEndpoints(left: TileLayout, right: TileLayout): LineEndpoints {
  return {
    x1: left.x + left.width,
    y1: left.y + left.height / 2,
    x2: right.x,
    y2: right.y + right.height / 2,
  };
}

type DomMeasurable = { getBoundingClientRect: () => { left: number; top: number; width: number; height: number } };

function isDomMeasurable(node: object): node is DomMeasurable {
  return 'getBoundingClientRect' in node && typeof node.getBoundingClientRect === 'function';
}

/** Reports where `tile` sits inside `container`; does nothing while either is unmounted. */
export function measureTile(
  tile: HostInstance | null | undefined,
  container: HostInstance | null,
  onMeasured: (layout: TileLayout) => void,
) {
  if (!tile || !container) return;
  if (typeof tile.measureLayout === 'function') {
    tile.measureLayout(
      container,
      (x, y, width, height) => onMeasured({ x, y, width, height }),
      () => {},
    );
    return;
  }
  // A web host ref without `measureLayout` is a plain DOM element.
  if (isDomMeasurable(tile) && isDomMeasurable(container)) {
    const tileRect = tile.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    onMeasured({
      x: tileRect.left - containerRect.left,
      y: tileRect.top - containerRect.top,
      width: tileRect.width,
      height: tileRect.height,
    });
  }
}
