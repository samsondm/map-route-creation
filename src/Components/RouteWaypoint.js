import React from 'react';
import PropTypes from 'prop-types';
import './RouteWaypoint.scss';
import rAFThrottle from '../utility/rAFThrottle';
import rAFTranslate, { easeOutQuad } from '../utility/rAFTranslate';
import parseTranslate from '../utility/parseTranslate';

const getMovedDistance = (
  { x: prevX, y: prevY } = {},
  { x: currX, y: currY } = {},
) =>
  prevX !== undefined &&
  prevY !== undefined &&
  currX !== undefined &&
  currY !== undefined
    ? Math.sqrt(Math.pow(currX - prevX, 2) + Math.pow(currY - prevY, 2))
    : null;

class RouteWaypoint extends React.Component {
  state = {
    transitionTime: 0,
    transform: `translate3d(${0}px, ${0}px, 0)`,
    prevIndex: null,
  };

  sloppyClick = true;
  hasDragged = false;
  isDragging = false;
  longTouchTimeoutID = null;
  longTouchWait = 200;
  moveTriggerDelta = 3; // how far should the cursor move from startTouch to trigger drag
  startGestureCoord = null;

  draggedOnRAFTranslate = null;

  routeWaypointRef = React.createRef();
  waypointRef = React.createRef();
  buttonRef = React.createRef();
  iconRef = React.createRef();

  isPointerSupported = Boolean(window.PointerEvent);
  scrollingElement = document.scrollingElement || document.documentElement;
  _isMounted = false;

  updateBaseRect = () => {
    const rect = this.routeWaypointRef.current.getBoundingClientRect();
    this.baseRect = {
      top: rect.top + this.scrollingElement.scrollTop,
      bottom: rect.bottom + this.scrollingElement.scrollTop,
      left: rect.left + this.scrollingElement.scrollLeft,
      right: rect.right + this.scrollingElement.scrollLeft,
    };
    this.props.setBaseRect(this.props.index, this.baseRect);
  };

  componentDidMount() {
    this._isMounted = true;
    this.dragUpdateThrottled = rAFThrottle(this.dragUpdate);

    this.buttonRef.current.addEventListener(
      'touchstart',
      this.handleButtonClick,
      true,
    );
    if (!this.isPointerSupported) {
      // manualy add touch start events because react puts events on document
      // and chrome calls top level event handler with passive flag for scroll performance
      // so we wont be able to call preventDefault
      this.iconRef.current.addEventListener(
        'touchstart',
        this.handleGestureStart,
      );
    }
    // store base rect in parent state for collision detection
    this.updateBaseRect();
    // update base rects on window resize
    window.addEventListener('resize', this.updateBaseRect);
  }

  componentWillUnmount() {
    this._isMounted = false;
    window.removeEventListener('resize', this.updateBaseRect);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (
      this.props.draggedCurrRect !== nextProps.draggedCurrRect ||
      this.props.state.transform !== nextProps.state.transform ||
      this.state.transform !== nextState.transform ||
      this.props.index !== nextProps.index ||
      ((this.isDragging || this.hasDragged) &&
        nextProps.isTransitioning !== this.props.isTransitioning)
    ) {
      return true;
    }
    return false;
  }

  componentDidUpdate(prevProps, prevState) {
    // update baseRect if waypoint changed position
    if (this.props.index !== prevProps.index) {
      if (this.rafTransition) {
        window.cancelAnimationFrame(this.rafTransition);
        this.rafTransition = null;
      }
      this.updateBaseRect();
    }
    // update dragged waypoint on transition end
    if (
      this.hasDragged &&
      !this.props.isTransitioning &&
      prevProps.isTransitioning !== this.props.isTransitioning
    ) {
      this.hasDragged = false;
    }
    // update wp that moved when dragged on wp was found
    if (
      prevProps.state.transform !== this.props.state.transform &&
      !this.isDragging &&
      !this.hasDragged &&
      this.props.isTransitioning
    ) {
      // cancel current transition
      if (this.draggedOnRAFTranslate) {
        this.draggedOnRAFTranslate.cancel();
      }
      // start new transition
      const transitionTime = this.props.state.transitionTime;
      const timeLeft = !this.draggedOnRAFTranslate
        ? 0
        : this.draggedOnRAFTranslate.getTimeLeft();
      const startCoord = parseTranslate(
        this.waypointRef.current.style.transform,
      );
      const endCoord = parseTranslate(this.props.state.transform);
      const props = {
        startTime: performance.now(),
        duration: transitionTime - timeLeft,
        startCoord,
        endCoord,
        timingFunc: easeOutQuad,
        nodeStyle: this.waypointRef.current.style,
      };
      this.draggedOnRAFTranslate = rAFTranslate(props);
    }
  }

  handleButtonClick = e => {
    if (this.props.isTransitioning) return;
    e.preventDefault();
    this.cancelLongTouch();
    this.props.handleDelete(this.props.state.id);
  };

  getCurrGesturePageCoord = e => {
    return e.touches && e.changedTouches[0] // check if touch event
      ? {
          x: e.changedTouches[0].pageX,
          y: e.changedTouches[0].pageY,
        }
      : {
          x: e.pageX,
          y: e.pageY,
        };
  };

  dragUpdate = () => {
    if (!this._isMounted) return;
    const translationVector = {
      x: this.currGestureCoord.x - this.startGestureCoord.x,
      y: this.currGestureCoord.y - this.startGestureCoord.y,
    };
    this.dragAnimating(translationVector);
    this.props.updateWaypoints(translationVector);
  };

  updateWaypointStyle = (transform, transition) => {
    const style = {
      transition: `transform ${transition}ms ease`,
      WebkitTransition: `-webkit-transform ${transition}ms ease`,
      transform: transform,
      WebkitTransform: transform,
      msTransform: transform,
    };
    Object.assign(this.waypointRef.current.style, style);
  };

  // drag animation on touch move
  dragAnimating = ({ x: deltaX, y: deltaY }) => {
    const transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
    this.updateWaypointStyle(transform, 0);
  };

  cancelLongTouch = () => {
    window.clearTimeout(this.longTouchTimeoutID);
    this.longTouchTimeoutID = null;
  };

  handleGestureStart = e => {
    if (this.props.isTransitioning || this.isDragging || this.hasDragged) {
      return;
    }
    e.preventDefault();
    if (e.touches && e.touches.length > 1) return;
    this.hasGestureStarted = true;
    this.startGestureCoord = this.getCurrGesturePageCoord(e);
    this.currGestureCoord = this.startGestureCoord;

    if (this.isPointerSupported) {
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      document.addEventListener('mousemove', this.handleGestureMove, true);
      document.addEventListener('mouseup', this.handleGestureEnd, true);
    }
    this.longTouchTimeoutID = window.setTimeout(() => {
      this.isDragging = true;
      // store dragged index in parent state
      this.props.setDragged(this.props.index);
    }, this.longTouchWait);
  };

  handleGestureMove = e => {
    if (!this.hasGestureStarted) return;
    this.currGestureCoord = this.getCurrGesturePageCoord(e);
    // check if our move is not a sloppy click
    if (this.sloppyClick) {
      const movedDistance = getMovedDistance(
        this.startGestureCoord,
        this.currGestureCoord,
      );
      if (movedDistance <= this.moveTriggerDelta) {
        return;
      }
    }
    this.sloppyClick = false;
    // check if long touch has started drag
    if (!this.isDragging) {
      this.cancelLongTouch();
      return;
    }
    // dont move if transitioning not started
    if (!this.props.isTransitioning) {
      return;
    }
    // dragging
    e.preventDefault();
    this.dragUpdateThrottled();
  };

  handleGestureEnd = e => {
    this.hasGestureStarted = false;
    // prevent during dragged end transition
    if (this.hasDragged) return;

    e.preventDefault();
    if (e.touches && e.touches.length > 0) {
      return;
    }
    if (this.isPointerSupported) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } else {
      // Remove Mouse Listeners
      document.removeEventListener('mousemove', this.handleGestureMove, true);
      document.removeEventListener('mouseup', this.handleGestureEnd, true);
    }

    this.sloppyClick = true;
    // cancel long touch if gesture end comes first
    if (!this.isDragging && !this.hasDragged) {
      this.cancelLongTouch();
      return;
    }

    // cancel pending dragging rAF
    this.dragUpdateThrottled.cancel();
    // start dragged end transition
    this.isDragging = false;
    this.hasDragged = true;
    const deltaY = this.props.draggedCurrRect.top - this.baseRect.top;
    const transitionTime = this.props.state.transitionTime;
    const startCoord = parseTranslate(this.waypointRef.current.style.transform);
    const endCoord = {
      x: 0,
      y: deltaY,
    };
    const props = {
      startTime: performance.now(),
      duration: transitionTime,
      startCoord,
      endCoord,
      timingFunc: easeOutQuad,
      nodeStyle: this.waypointRef.current.style,
    };
    // callback after dragged end transition finishes
    const callback = () => {
      const transform = `translate3d(${0}px, ${0}px, 0)`;
      this.updateWaypointStyle(transform, 0);
      // update parent state
      this.props.handleMoveEnd();
    };
    rAFTranslate(props, callback);
  };

  handleGesture = this.isPointerSupported
    ? {
        onPointerDown: this.handleGestureStart,
        onPointerMove: this.handleGestureMove,
        onPointerUp: this.handleGestureEnd,
        onPointerCancel: this.handleGestureEnd,
      }
    : {
        onMouseDown: this.handleGestureStart,
        onTouchMove: this.handleGestureMove,
        onTouchEnd: this.handleGestureEnd,
      };

  render() {
    const [transform, transitionTime] = this.isDragging
      ? // if dragging instant move
        [this.state.transform, 0]
      : this.hasDragged
      ? [this.state.transform, this.props.state.transitionTime]
      : !this.props.state.transitionTime
      ? [this.props.state.transform, this.props.state.transitionTime]
      : [`translate(${0}px, ${0}px)`, 0];
    const waypointStyle = {
      transition: `transform ${transitionTime}ms ease`,
      WebkitTransition: `-webkit-transform ${transitionTime}ms ease`,
      transform: transform,
      WebkitTransform: transform,
      msTransform: transform,
    };
    const waypointClass =
      'route-waypoint__draggable' +
      (this.isDragging ? ' route-waypoint__draggable_dragging' : '');
    const iconClass =
      'route-waypoint__icon' +
      (this.isDragging ? ' route-waypoint__icon_dragging' : '');
    return (
      <div
        className={'route-waypoint ' + this.props.className}
        ref={this.routeWaypointRef}
      >
        <div
          className={waypointClass}
          style={waypointStyle}
          ref={this.waypointRef}
        >
          <div
            className={iconClass}
            ref={this.iconRef}
            {...this.handleGesture}
          />
          <div className="route-waypoint__name">{this.props.state.name}</div>
          <button
            type="button"
            className="route-waypoint__button"
            ref={this.buttonRef}
            onClick={this.handleButtonClick}
          />
        </div>
      </div>
    );
  }
}

RouteWaypoint.propTypes = {
  index: PropTypes.number,
  state: PropTypes.shape({
    name: PropTypes.string,
    id: PropTypes.number,
    style: PropTypes.shape({
      transform: PropTypes.string,
      WebkitTransform: PropTypes.string,
      msTransform: PropTypes.string,
    }),
  }),
  className: PropTypes.string,
  handleDelete: PropTypes.func,
  setDragged: PropTypes.func,
  setBaseRect: PropTypes.func,
  updateWaypoints: PropTypes.func,
  draggedIndex: PropTypes.number,
  isDragging: PropTypes.bool,
};

export default RouteWaypoint;
