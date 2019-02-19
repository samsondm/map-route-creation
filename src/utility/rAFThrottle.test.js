import rAFThrottle from './rAFThrottle';
import lolex from 'lolex';
import { randomString } from './test-utility';

describe('rAFThrottle', () => {

  const func = jest.fn();
  const raf = rAFThrottle(func);
  let clock, args;

  beforeEach(() => {
    clock = lolex.install();
    args = {};
    raf(args);
  });

  afterEach(() => {
    jest.clearAllMocks();
    clock.uninstall();
  });

  it('returns function that calls passed function with rAF and passed arguments', () => {
    expect(func).not.toHaveBeenCalled();
    clock.tick(16);
    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith(args);
  });

  it('returned function executes with the latest passed arguments during rAF', () => {
    let arg1, arg2;
    for (let i = 0; i < 15; i++) {
      arg1 = arg2 = randomString() + i;
      raf(arg1, arg2);
      clock.tick(1);
    }
    expect(func).toHaveBeenCalledTimes(0);
    clock.tick(1);
    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith(arg1, arg2);
    arg1 = arg2 = randomString();
    raf(arg1, arg2);
    clock.next();
    expect(func).toHaveBeenCalledTimes(2);
    expect(func).toHaveBeenCalledWith(arg1, arg2);
  });

  it('returned function rAF can be canceled with cancel property', () => {
    clock.tick(6);
    raf.cancel();
    clock.tick(20);
    expect(func).toHaveBeenCalledTimes(0);
  });
});