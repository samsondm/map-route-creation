import rAFTranslate, { easeOutQuad } from './rAFTranslate';
import lolex from 'lolex';

describe('rAFTranslate', () => {
  let clock, div, props, performanceNow;
  beforeAll(() => {
    clock = lolex.install();
    performanceNow = global.performance.now;
    global.performance.now = clock.performance.now;
  });
  beforeEach(() => {
    div = document.createElement('div');
    props = {
      startTime: performance.now(),
      duration: 160,
      startCoord: { x: 0, y: 0 },
      endCoord: { x: 100, y: 100 },
      timingFunc: easeOutQuad,
      nodeStyle: div.style,
    };
  });
  afterEach(() => {
    clock.reset();
  });
  afterAll(() => {
    clock.uninstall();
    global.performance.now = performanceNow;
  });

  it('animates translate movement with rAF', () => {
    const {
      startCoord: { x: sX, y: sY },
      endCoord: { x: eX, y: eY },
      timingFunc,
      nodeStyle,
      duration,
    } = props;
    const raf = rAFTranslate(props);
    const frameInterval = 16;
    const passedFrames = 6;
    const passedTime = passedFrames * frameInterval;
    const passedNormTime = passedTime / duration;
    const tX = eX - sX;
    const tY = eY - sY;
    const passedFraction = timingFunc(passedNormTime);
    const dX = passedFraction * tX;
    const dY = passedFraction * tY;
    const transform = `translate3d(${dX}px, ${dY}px, ${0}px)`;
    for (let i = 0; i < passedFrames; i++) {
      clock.runToFrame();
    }
    expect(raf.getPassedTime()).toBe(passedTime);
    expect(raf.getPassedTime() + raf.getTimeLeft()).toBe(duration);
    expect(nodeStyle.transform).toBe(transform);
  });

  it('calling cancel stops translate', () => {
    const raf = rAFTranslate(props);
    clock.runToFrame();
    const transform = div.style.transform;
    raf.cancel();
    clock.runToFrame();
    expect(div.style.transform).toBe(transform);
  });

  it("calls callback function if it's passed", () => {
    const callback = jest.fn();
    const raf = rAFTranslate(props, callback);
    clock.runAll();
    expect(raf.getPassedTime()).toBe(props.duration);
    expect(callback).toHaveBeenCalled();
  });
});
