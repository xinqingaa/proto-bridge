export type MarkBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ScreenMark = {
  id: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Screenshot pixels are the viewport multiplied by an integer device scale. */
export function cssViewportForScreenshot(
  naturalWidth: number,
  naturalHeight: number,
  boxes: readonly MarkBox[],
): { width: number; height: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: 0, height: 0 };
  }
  const usable = boxes.filter((box) => box.width > 0 && box.height > 0);
  for (const scale of [3, 2, 1]) {
    const width = naturalWidth / scale;
    const height = naturalHeight / scale;
    if (usable.length === 0) return { width, height };
    const hits = usable.filter((box) => intersects(box, width, height)).length;
    if (hits >= Math.max(1, Math.ceil(usable.length * 0.4))) {
      return { width, height };
    }
  }
  return { width: naturalWidth, height: naturalHeight };
}

export function marksForBoxes(
  boxes: readonly (MarkBox & { id: string; label: string })[],
  viewport: { width: number; height: number },
  options: { keepFullScreen?: boolean } = {},
): ScreenMark[] {
  if (viewport.width <= 0 || viewport.height <= 0) return [];
  const area = viewport.width * viewport.height;
  return boxes.flatMap((box) => {
    const clipped = clip(box, viewport);
    if (!clipped) return [];
    if (!options.keepFullScreen && (clipped.width * clipped.height) / area > 0.92) {
      return [];
    }
    return [
      {
        id: box.id,
        label: box.label,
        left: (clipped.x / viewport.width) * 100,
        top: (clipped.y / viewport.height) * 100,
        width: (clipped.width / viewport.width) * 100,
        height: (clipped.height / viewport.height) * 100,
      },
    ];
  });
}

export function idsOnScreen(
  boxes: readonly (MarkBox & { id: string })[],
  viewport: { width: number; height: number },
): Set<string> {
  return new Set(
    boxes.filter((box) => clip(box, viewport)).map((box) => box.id),
  );
}

function intersects(
  box: MarkBox,
  width: number,
  height: number,
): boolean {
  return (
    box.x < width &&
    box.y < height &&
    box.x + box.width > 0 &&
    box.y + box.height > 0
  );
}

function clip(
  box: MarkBox,
  viewport: { width: number; height: number },
): MarkBox | null {
  const x = Math.max(0, box.x);
  const y = Math.max(0, box.y);
  const right = Math.min(viewport.width, box.x + box.width);
  const bottom = Math.min(viewport.height, box.y + box.height);
  const width = right - x;
  const height = bottom - y;
  if (width < 2 || height < 2) return null;
  return { x, y, width, height };
}
