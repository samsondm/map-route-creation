import React from 'react';
import PropTypes from 'prop-types';
import './RouteWaypoint.scss';

// const throttle = (func, ms) => {
//   let isRunning = false;
//   return (...params) => {
//     if (!isRunning) {
//       isRunning = true;
//       func(...params);
//       setTimeout(() => isRunning = false, ms);
//     }
//   }
// }

class RouteWaypoint extends React.Component {
  initState = () => ({
    isDragged: false,
  });

  state = {
    ...this.initState(),
    prevIndex: null
  }
  waypointRef = React.createRef();
  buttonRef = React.createRef();
  rafID = null;
  isPointerSupported = Boolean(window.PointerEvent);
  scrollingElement = document.scrollingElement || document.documentElement;
  _isMounted = false;

  updateBaseRect = () => {
    const rect = this.waypointRef.current.getBoundingClientRect();
    const baseRect = {
      top: rect.top + this.scrollingElement.scrollTop,
      bottom: rect.bottom + this.scrollingElement.scrollTop,
      left: rect.left + this.scrollingElement.scrollLeft,
      right: rect.right + this.scrollingElement.scrollLeft
    };
    this.props.setWaypointDocCoord(this.props.index, baseRect);
  }


  componentDidMount() {
    this._isMounted = true;

    this.buttonRef.current.addEventListener('touchstart', this.handleButtonClick, true);
    if (!this.isPointerSupported) {
      // manualy add touch start events because of react bug with chrome
      this.waypointRef.current.addEventListener('touchstart', this.handleGestureStart, true);
    }
    this.updateBaseRect();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  static getDerivedStateFromProps(props, state) {
    if (state.prevIndex === null) {
      return {
        prevIndex: props.index
      };
    }
    return null;
  }

  componentDidUpdate(prevProps) {
    // update baseRect for moved waypoints
    if (this.state.prevIndex !== this.props.index && !this.state.isDragged) {
      this.updateBaseRect();
      this.setState({
        prevIndex: this.props.index
      });
    }
    // update border onGestureEnd
    if (!this.props.isDragging && this.props.isDragging !== prevProps.isDragging && this.state.isDragged) {
      this.setState({
        isDragged: false
      });
    }
  }

  handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.cancelAnimationFrame(this.rafID);
    this.props.handleDelete(this.props.state.id);
  };

  updateDraggedState = (e) => {
    this.setState({
      isDragged: true
      // posible race condition ?
      // set dragged index on parent
    }, () => this.props.setDragged(this.props.index));
  };

  handleGestureStart = (e) => {
    e.preventDefault();
    if (e.touches && e.touches.length > 1) return;
    this.updateDraggedState();
  }

  handleGesture = this.isPointerSupported ? {
    onPointerDown: this.handleGestureStart,
  } : {
      onMouseDown: this.handleGestureStart,
    };

  handleButtonDown = this.isPointerSupported ? {
    onPointerDown: this.handleButtonClick
  } : {
      onMouseDown: this.handleButtonClick
    }

  render() {
    const waypointClass = "route-waypoint__draggable" + (this.state.isDragged ? " route-waypoint__draggable_dragging" : "");
    return (
      <div className={"route-waypoint " + this.props.className}>
        <div {...this.handleGesture} className={waypointClass} style={this.props.state.style} ref={this.waypointRef}>
          <div className="route-waypoint__name">
            {this.props.state.name}
          </div>
          <button type="button" className="route-waypoint__button" ref={this.buttonRef} {...this.handleButtonDown} />
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
      msTransform: PropTypes.string
    })
  }),
  className: PropTypes.string,
  handleDelete: PropTypes.func,
  setDragged: PropTypes.func,
  setWaypointDocCoord: PropTypes.func,
  findDraggedOn: PropTypes.func,
  draggedIndex: PropTypes.number,
  isDragging: PropTypes.bool
};

export default RouteWaypoint;