// call rAF with the latest args that have come durring queue
export default function rAFThrottle(func) {
  let rafID = null;
  let latestArgs = null;
  const raf = (...args) => {
    // update args of the queued func
    latestArgs = args;
    // dont queue if already queued
    if (rafID) {
      return;
    }
    rafID = requestAnimationFrame(() => {
      rafID = null;
      func(...latestArgs);
    });
  }
  raf.cancel = () => {
    if (!rafID) return;
    window.cancelAnimationFrame(rafID);
    rafID = null;
  }
  return raf;
}
