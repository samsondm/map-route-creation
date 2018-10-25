import React from 'react';
import RouteWaypoint from './RouteWaypoint';
import RouteInput from './RouteInput';
import RouteMap from './RouteMap';
import Centering from './Centering';
import './MapRouteCreation.scss';

export const parseTransformTranslate = (transform) => {
  if (!transform) return { x: 0, y: 0 };
  const { 0: x, 1: y } = transform.match(/-?\d+(\.\d+)?/g);
  return { x: +x, y: +y };
}


class MapRouteCreation extends React.Component {

  state = {
    isMaxWaypointsReached: false,
    isMapLoaded: false,
    waypoints: [],
    id: 0,
    draggedIndex: null,
    mapPayload: {
      id: null,
      newIndex: null,
      action: '',
      name: ''
    },
    isDragAnimating: false,
    isDragStarted: false,
    canDragStart: false
  };

  startTouchCoord = null;
  isPointerSupported = Boolean(window.PointerEvent);

  waypointsRef = React.createRef()

  componentDidMount() {
    this._isMounted = true;
    this.handleGesture = this.isPointerSupported ?
      {
        onPointerDown: this.handleGestureStart,
        onPointerMove: this.handleGestureMove,
        onPointerUp: this.handleGestureEnd,
        onPointerCancel: this.handleGestureEnd
      } : {
        onMouseDown: this.handleGestureStart,
        onTouchMove: this.handleGestureMove,
        onTouchEnd: this.handleGestureEnd,
      };
    if (!this.isPointerSupported) {
      // manualy add touch start events because of react bug with chrome
      this.waypointsRef.current.addEventListener('touchstart', this.handleGestureStart);
    }

  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  handleEnter = (value) => {
    this.setState(prevState => {
      if (prevState.waypoints.length === 15) {
        return {
          isMaxWaypointsReached: true
        };
      }
      return {
        waypoints: [...prevState.waypoints, {
          name: value,
          id: prevState.id,
          style: {
            transform: ``,
            WebkitTransform: ``,
            msTransform: ``
          }
        }],
        id: prevState.id + 1,
        mapPayload: {
          id: prevState.id,
          action: 'ADD',
          name: value,
        }
      }
    });
  };

  handleDelete = (id) => {
    this.setState(prevState => ({
      waypoints: prevState.waypoints.filter(wp => wp.id !== id),
      isMaxWaypointsReached: false,
      mapPayload: {
        id: id,
        action: 'DELETE'
      }
    }));
  };

  setWaypointDocCoord = (index, baseRect) => {
    const newWaypoints = [...this.state.waypoints];
    newWaypoints[index].baseRect = baseRect;
    this.setState({
      waypoints: newWaypoints
    });
  }

  findDraggedOn = (prevGestureCoord, currGestureCoord) => {
    this.state.waypoints.every((wp, index) => {
      if (wp.id === this.state.waypoints[this.state.draggedIndex].id) {
        return true;
      }
      const wpCenter = (wp.baseRect.top + wp.baseRect.bottom) / 2;
      if (wpCenter <= Math.max(prevGestureCoord.y, currGestureCoord.y) &&
        wpCenter >= Math.min(prevGestureCoord.y, currGestureCoord.y) &&
        wp.baseRect.left <= currGestureCoord.x &&
        wp.baseRect.right >= currGestureCoord.x) {
        this.handleMove(index);
        return false;
      }
      return true;
    });
  };

  setDragged = (index) => {
    this.setState({
      canDragStart: true,
      draggedIndex: index,
      mapPayload: {
        action: ''
      }
    });
  }

  handleMove = (newIndex) => {
    this.setState(prevState => {
      let newWaypoints = [...prevState.waypoints];
      const oldIndex = prevState.draggedIndex;
      const { top: oldRectTop } = newWaypoints[oldIndex].baseRect;
      const { top: newRectTop } = newWaypoints[newIndex].baseRect;
      const deltaY = newRectTop - oldRectTop;
      this.startTouchCoord = {
        x: this.startTouchCoord.x,
        y: this.startTouchCoord.y + deltaY
      }

      const { x } = parseTransformTranslate(newWaypoints[oldIndex].style.transform);

      const transform = `translate(${x}px, ${0}px)`;
      newWaypoints[prevState.draggedIndex].style = {
        transform: transform,
        WebkitTransform: transform,
        msTransform: transform
      };

      const draggedID = prevState.waypoints[oldIndex].id;
      // get new baseRect for dragging waypoint so we can properly animate
      newWaypoints[oldIndex].baseRect = newWaypoints[newIndex].baseRect;
      const draggedWaypoint = newWaypoints.splice(oldIndex, 1)[0];
      newWaypoints.splice(newIndex, 0, draggedWaypoint);
      window.cancelAnimationFrame(this.rafID);
      return {
        isDragAnimating: false,
        draggedIndex: newIndex,
        waypoints: newWaypoints,
        mapPayload: {
          id: draggedID,
          newIndex,
          action: 'MOVE'
        }
      };
    });
  }

  handleMapLoad = () => this.setState({
    isMapLoaded: true
  });

  getCurrentPageCoordinates = (e) => {
    return e.touches && e.changedTouches[0] ? // check if touch event
      {
        x: e.changedTouches[0].pageX,
        y: e.changedTouches[0].pageY
      } : {
        x: e.pageX,
        y: e.pageY
      };
  }
  // drag animation on touch move
  dragAnimating = ({ x: deltaX, y: deltaY }) => {
    if (!this._isMounted || !this.state.isDragAnimating) return;
    this.setState(prevState => {
      const newWaypoints = [...prevState.waypoints];
      const transform = `translate(${deltaX}px, ${deltaY}px)`;
      newWaypoints[prevState.draggedIndex].style = {
        transform: transform,
        WebkitTransform: transform,
        msTransform: transform
      }
      return {
        waypoints: newWaypoints,
      }
    }, () => {
      this.setState({
        isDragAnimating: false
      });
    });
  }

  handleGestureStart = (e) => {
    e.preventDefault();
    if (e.touches && e.touches.length > 1) return;
    if (this.isPointerSupported) {
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      document.addEventListener('mousemove', this.handleGestureMove, true);
      document.addEventListener('mouseup', this.handleGestureEnd, true);
    }

    this.startTouchCoord = this.getCurrentPageCoordinates(e);
    this.currPointerCoord = this.startTouchCoord;
    this.setState({
      isDragStarted: true
    });
  };

  handleGestureMove = (e) => {
    if (!this.state.canDragStart) return;

    e.preventDefault();
    if (!this.state.isDragStarted) return;
    if (!this.state.isDragAnimating) {
      this.setState({
        isDragAnimating: true
      });
      this.prevPointerCoord = this.currPointerCoord;
      this.currPointerCoord = this.getCurrentPageCoordinates(e);
      const deltaCoordinates = {
        x: this.currPointerCoord.x - this.startTouchCoord.x,
        y: this.currPointerCoord.y - this.startTouchCoord.y
      }
      this.findDraggedOn(this.prevPointerCoord, this.currPointerCoord);
      // if (this.haveFoundDraggedOn) return;
      // this.throttledFindDraggedOn(this.prevPointerCoord, this.currPointerCoord);
      this.rafID = window.requestAnimationFrame(() => this.dragAnimating(deltaCoordinates));
    }
  }

  handleGestureEnd = (e) => {
    e.preventDefault();
    if (e.touches && e.touches.length > 0) {
      return;
    }

    // Remove Event Listeners
    if (this.isPointerSupported) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } else {
      // Remove Mouse Listeners
      document.removeEventListener('mousemove', this.handleGestureMove, true);
      document.removeEventListener('mouseup', this.handleGestureEnd, true);
    }

    this.setState(prevState => {
      const newWaypoints = [...prevState.waypoints];
      if (newWaypoints[prevState.draggedIndex]) {
        newWaypoints[prevState.draggedIndex].style = {
          transform: '',
          WebkitTransform: '',
          msTransform: ''
        };
      }
      return {
        newWaypoints,
        draggedIndex: null,
        isDragStarted: false,
        canDragStart: false,
        isDragAnimating: false
      }
    });
    this.rafID = null;
  }


  render() {
    const waypoints = this.state.waypoints.map((wp, index) =>
      <RouteWaypoint
        key={wp.id.toString()}
        index={index}
        state={wp}
        className="map-route-creation__waypoint"
        handleDelete={this.handleDelete}
        setDragged={this.setDragged}
        draggedIndex={this.state.draggedIndex}
        isDragging={this.state.isDragStarted}
        setWaypointDocCoord={this.setWaypointDocCoord}
        findDraggedOn={this.findDraggedOn}
      />
    );
    const waypointsClass = "map-route-creation__waypoints " + (this.state.isDragStarted ? "map-route-creation__waypoints_dragging" : "");
    return (
      <Centering height="100vh">
        <div className="map-route-creation" ref={this.mapRouteRef}>
          <div className="map-route-creation__content" >
            <RouteInput className="map-route-creation__input" handleEnter={this.handleEnter} placeholder="Новая точка маршрута" isMapLoaded={this.state.isMapLoaded} />
            <div className={waypointsClass} {...this.handleGesture} ref={this.waypointsRef}>
              {waypoints}
            </div>
            {this.state.isMaxWaypointsReached && <div className="map-route-creation__warning">15 точек максимум</div>}
          </div>
          <RouteMap className="map-route-creation__map" payload={this.state.mapPayload} onMapLoad={this.handleMapLoad} />
        </div>
      </Centering>
    );
  }
}

export default MapRouteCreation;