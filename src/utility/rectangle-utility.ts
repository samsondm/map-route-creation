type Rect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export function isRect(rect: Rect): boolean {
  return rect.top < rect.bottom && rect.left < rect.right;
}

export function calcRectArea(rect: Rect): number | null {
  return isRect(rect)
    ? (rect.bottom - rect.top) * (rect.right - rect.left)
    : null;
}

export function doRectIntersect(rect1: Rect, rect2: Rect): boolean {
  return (
    isRect(rect1) &&
    isRect(rect2) &&
    !(
      rect1.top >= rect2.bottom || // rect1 under rect2
      rect1.bottom <= rect2.top || // rect1 over rect2
      rect1.left >= rect2.right || // rect1 to the right of rect2
      // rect1 to the left of rect2
      rect1.right <= rect2.left
    )
  );
}

export function calcIntersectionRect(rect1: Rect, rect2: Rect): Rect | null {
  return doRectIntersect(rect1, rect2)
    ? {
        top: Math.max(rect1.top, rect2.top),
        bottom: Math.min(rect1.bottom, rect2.bottom),
        left: Math.max(rect1.left, rect2.left),
        right: Math.min(rect1.right, rect2.right),
      }
    : null;
}
