import { randomString, randomNumber } from './test-utility';

it('randomString generates string of set size', () => {
  for (let i = 1; i < 50; i++) {
    const random = randomString(i);
    const string = "^[a-z0-9]{" + i + "}";
    const regex = new RegExp(string, "i");
    expect(random).toMatch(regex);
  }
});

it('randomNumber generates numbers in set interval', () => {
  for (let i = 0; i < 100; i++) {
    const random = randomNumber({ min: 0, max: 50 });
    expect(random).toBeGreaterThanOrEqual(0);
    expect(random).toBeLessThanOrEqual(50);
    expect(Number.isInteger(random)).toBe(true);
  }
});