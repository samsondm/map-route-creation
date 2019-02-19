type TimingFunction = (t: number) => number;

const easeOutQuad: TimingFunction = t => t * (2 - t); // timing function

type Point2D = {
  x: number;
  y: number;
};

interface IProps {
  startTime: number;
  duration: number;
  startCoord: Point2D;
  endCoord: Point2D;
  timingFunc: TimingFunction;
  nodeStyle: CSSStyleDeclaration;
}
// TODO: move calculation of startCoord into function
function rAFTranslate(props: IProps, callback: Function) {
  if (!props) return;
  const {
    startTime,
    duration,
    startCoord: { x: startX, y: startY },
    endCoord: { x: endX, y: endY },
    timingFunc,
    nodeStyle,
  } = props;
  const distanceX = endX - startX;
  const distanceY = endY - startY;
  let rafID: number | null = null;
  let passedTime: number, timeLeft: number;

  const cancel = (): void => {
    if (!rafID) return;
    window.cancelAnimationFrame(rafID);
    rafID = null;
  };

  const getPassedTime = () => passedTime;
  const getTimeLeft = () => timeLeft;

  const rAF = (now: number) => {
    passedTime = now - startTime;
    passedTime = passedTime >= 0 ? passedTime : 0;
    timeLeft = duration - passedTime;
    const passedNormTime = passedTime / duration;
    const passedDistanceX = timingFunc(passedNormTime) * distanceX;
    const passedDistanceY = timingFunc(passedNormTime) * distanceY;

    nodeStyle.transform = `translate3d(${startX + passedDistanceX}px, ${startY +
      passedDistanceY}px, ${0}px)`;
    if (passedNormTime >= 1) {
      nodeStyle.transform = `translate3d(${endX}px, ${endY}px, ${0}px)`;
      passedTime = duration;
      timeLeft = 0;
      if (callback) callback();
      return;
    }
    rafID = window.requestAnimationFrame(rAF);
  };
  rafID = window.requestAnimationFrame(rAF);
  return {
    cancel,
    getPassedTime,
    getTimeLeft,
  };
}

export { easeOutQuad };
export default rAFTranslate;
