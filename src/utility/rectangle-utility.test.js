import {
  isRect,
  calcRectArea,
  doRectIntersect,
  calcIntersectionRect,
} from './rectangle-utility';

test.each`
  rect                                        | expected
  ${{ top: 0, bottom: 0, left: 0, right: 0 }} | ${false}
  ${{ top: 1, bottom: 0, left: 0, right: 0 }} | ${false}
  ${{ top: 0, bottom: 1, left: 0, right: 0 }} | ${false}
  ${{ top: 0, bottom: 0, left: 1, right: 0 }} | ${false}
  ${{ top: 0, bottom: 0, left: 0, right: 1 }} | ${false}
  ${{ top: 0, bottom: 1, left: 0, right: 1 }} | ${true}
`('isRect returns $expected when rectangle is $rect', ({ rect, expected }) => {
  expect(isRect(rect)).toBe(expected);
});

test.each`
  rect                                            | expected
  ${{ top: 0, bottom: 0, left: 0, right: 0 }}     | ${null}
  ${{ top: -1, bottom: 0, left: -1, right: 0 }}   | ${1}
  ${{ top: -2, bottom: -3, left: -4, right: -5 }} | ${null}
  ${{ top: 5, bottom: 10, left: 1, right: 4 }}    | ${15}
`('calcRectArea return $area when rectangle is $rect', ({ rect, expected }) => {
  expect(calcRectArea(rect)).toBe(expected);
});

test.each`
  rect1                                       | rect2                                       | expected
  ${{ top: 0, bottom: 0, left: 0, right: 0 }} | ${{ top: 0, bottom: 0, left: 0, right: 0 }} | ${false}
  ${{ top: 2, bottom: 4, left: 0, right: 4 }} | ${{ top: 0, bottom: 2, left: 0, right: 4 }} | ${false}
  ${{ top: 0, bottom: 2, left: 0, right: 2 }} | ${{ top: 0, bottom: 2, left: 2, right: 4 }} | ${false}
  ${{ top: 0, bottom: 2, left: 0, right: 2 }} | ${{ top: 1, bottom: 2, left: 1, right: 3 }} | ${true}
  ${{ top: 1, bottom: 2, left: 1, right: 3 }} | ${{ top: 1, bottom: 2, left: 0, right: 3 }} | ${true}
  ${{ top: 0, bottom: 9, left: 0, right: 9 }} | ${{ top: 0, bottom: 9, left: 0, right: 9 }} | ${true}
  ${{ top: 0, bottom: 9, left: 0, right: 9 }} | ${{ top: 1, bottom: 8, left: 2, right: 4 }} | ${true}
`(
  'doRectIntersect returns $expected when rect1 is $rect1 and rect2 is $rect2',
  ({ rect1, rect2, expected }) => {
    expect(doRectIntersect(rect1, rect2)).toBe(expected);
    expect(doRectIntersect(rect2, rect1)).toBe(expected);
  },
);

test.each`
  rect1                                       | rect2                                       | expected
  ${{ top: 0, bottom: 0, left: 0, right: 0 }} | ${{ top: 0, bottom: 0, left: 0, right: 0 }} | ${null}
  ${{ top: 2, bottom: 4, left: 0, right: 4 }} | ${{ top: 0, bottom: 2, left: 0, right: 4 }} | ${null}
  ${{ top: 0, bottom: 2, left: 0, right: 2 }} | ${{ top: 0, bottom: 2, left: 2, right: 4 }} | ${null}
  ${{ top: 0, bottom: 2, left: 0, right: 2 }} | ${{ top: 1, bottom: 3, left: 1, right: 3 }} | ${{ top: 1, bottom: 2, left: 1, right: 2 }}
  ${{ top: 0, bottom: 2, left: 1, right: 3 }} | ${{ top: 1, bottom: 3, left: 0, right: 2 }} | ${{ top: 1, bottom: 2, left: 1, right: 2 }}
  ${{ top: 0, bottom: 9, left: 0, right: 9 }} | ${{ top: 0, bottom: 9, left: 0, right: 9 }} | ${{ top: 0, bottom: 9, left: 0, right: 9 }}
  ${{ top: 0, bottom: 9, left: 0, right: 9 }} | ${{ top: 1, bottom: 8, left: 2, right: 4 }} | ${{ top: 1, bottom: 8, left: 2, right: 4 }}
`(
  'calcIntersectionRect returns $expected when rect1 is $rect1 and rect2 is $rect2',
  ({ rect1, rect2, expected }) => {
    expect(calcIntersectionRect(rect1, rect2)).toEqual(expected);
    expect(calcIntersectionRect(rect2, rect1)).toEqual(expected);
  },
);
