import React from 'react';
import RouteWaypoint from './RouteWaypoint';
import RouteInput from './RouteInput';
import RouteMap from './RouteMap';
import Centering from './Centering';
import './MapRouteCreation.scss';
import {
  calcRectArea,
  calcIntersectionRect,
} from '../utility/rectangle-utility';

export default class MapRouteCreation extends React.Component {
  state = {
    hasMoved: false,
    isMaxWaypointsReached: false,
    isMapLoaded: false,
    waypoints: [],
    id: 0,
    isTransitioning: false,
    draggedIndex: null,
    mapPayload: {
      id: null,
      newIndex: null,
      action: '',
      name: '',
    },
  };

  waypointsRects = [];

  transitionTime = 300;

  isPointerSupported = Boolean(window.PointerEvent);

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate(prevProps, prevState) {
    // on transition ends
    if (
      prevState.isTransitioning === true &&
      this.state.isTransitioning === false
    ) {
      // update transition time for moved wps
      const newWaypoints = [...this.state.waypoints];
      for (
        let i = Math.min(this.state.draggedCurrIndex, this.state.draggedIndex);
        i <= Math.max(this.state.draggedCurrIndex, this.state.draggedIndex);
        i++
      ) {
        newWaypoints[i].transitionTime = this.transitionTime;
      }
      this.setState({
        waypoints: newWaypoints,
      });
    }
  }

  handleEnter = value => {
    this.setState(prevState => {
      if (prevState.waypoints.length === 15) {
        return {
          isMaxWaypointsReached: true,
        };
      }
      return {
        waypoints: [
          ...prevState.waypoints,
          {
            name: value,
            id: prevState.id,
            transform: `translate(${0}px, ${0}px)`,
            transitionTime: this.transitionTime,
          },
        ],
        id: prevState.id + 1,
        mapPayload: {
          id: prevState.id,
          action: 'ADD',
          name: value,
        },
      };
    });
  };

  handleDelete = id => {
    this.waypointsRects = this.waypointsRects.filter(wp => wp.id !== id);
    this.setState(prevState => ({
      waypoints: prevState.waypoints.filter(wp => wp.id !== id),
      isMaxWaypointsReached: false,
      mapPayload: {
        id,
        action: 'DELETE',
      },
    }));
  };

  setBaseRect = (index, baseRect) => {
    this.waypointsRects[index] = baseRect;
  };

  setDragged = index => {
    this.setState({
      isTransitioning: true,
      draggedCurrRect: this.waypointsRects[index],
      draggedCurrIndex: index,
      draggedIndex: index,
      mapPayload: {
        action: '',
      },
    });
  };

  /**
   * Update waypoints during waypoint dragging
   * @param {{x: Number, y: Number}} translationVector
   * @returns {void}
   */
  updateWaypoints = translationVector => {
    const { hasMoved, draggedIndex, draggedCurrIndex } = this.state;
    const draggedOnIndex = this.findDraggedOn(translationVector);
    // ignore currently dragged on position
    if (draggedOnIndex !== null && draggedOnIndex !== draggedCurrIndex) {
      this.handleMove(draggedOnIndex);
    } else if (draggedOnIndex === null && hasMoved) {
      // dragged wp left dragged on position
      this.handleMove(draggedIndex);
    }
  };

  /**
   * Find dragged on waypoint
   * consider waypoints dragged on only
   * when intersection area with dragged waypoint
   * is bigger than areaFraction of waypoint's area
   * @param {{x: Number, y: Number}} translationVector
   * @param {Number} [wpAreaFraction=0.25]
   * @returns {number|null} -
   */
  findDraggedOn = ({ x, y }, wpAreaFraction = 0.33) => {
    const { waypoints, draggedIndex } = this.state;
    let draggedOnIndex = null;
    waypoints.every((wp, index) => {
      // skip dragged waypoint
      if (index === draggedIndex) {
        return true;
      }
      // calc the current coordinates of dragging rect
      const draggedBaseRect = this.waypointsRects[draggedIndex];
      const draggedRect = {
        top: draggedBaseRect.top + y,
        bottom: draggedBaseRect.bottom + y,
        left: draggedBaseRect.left + x,
        right: draggedBaseRect.right + x,
      };
      // calc intersection rect between dragged and potential dragged on
      const draggedOnRect = this.waypointsRects[index];
      const intersectionRect = calcIntersectionRect(draggedOnRect, draggedRect);
      // move waypoint if dragged wp coveres more than wpAreaFraction of dragged on wp area
      if (
        intersectionRect &&
        calcRectArea(intersectionRect) >
          wpAreaFraction * calcRectArea(draggedOnRect)
      ) {
        draggedOnIndex = index;
        return false;
      }
      return true;
    });
    return draggedOnIndex;
  };

  handleMove = newIndex => {
    this.setState(prevState => {
      const newWaypoints = [...prevState.waypoints];
      const initIndex = prevState.draggedIndex;
      const currIndex = prevState.draggedCurrIndex;
      let transform;
      let hasMoved = true;
      // calculate translate distance depending on move direction
      const isNewInside =
        // init ... new ... curr
        (initIndex < newIndex && newIndex < currIndex) ||
        // curr ... new ... init
        (currIndex < newIndex && newIndex < initIndex);
      const isNewOutSide =
        // init ... curr ... new
        (initIndex < currIndex && currIndex < newIndex) ||
        // new ... curr ... init
        (newIndex < currIndex && currIndex < initIndex);
      if (!this.state.hasMoved || isNewOutSide) {
        const deltaY =
          currIndex < newIndex
            ? this.waypointsRects[currIndex + 1].top -
              this.waypointsRects[currIndex].top
            : this.waypointsRects[currIndex - 1].bottom -
              this.waypointsRects[currIndex].bottom;
        transform = `translate(${0}px, ${-deltaY}px)`;
      } else if (isNewInside || newIndex === initIndex) {
        if (newIndex === initIndex) {
          hasMoved = false;
        }
        transform = `translate(${0}px, ${0}px)`;
      } else {
        return;
      }
      const isGoingUP = newIndex > currIndex;
      for (
        let i = currIndex;
        isGoingUP ? i <= newIndex : i >= newIndex;
        isGoingUP ? i++ : i--
      ) {
        if (i === initIndex || (isNewInside && i === newIndex)) continue;
        newWaypoints[i] = {
          ...newWaypoints[i],
          transform,
        };
      }
      // update curr dragged index
      const draggedCurrIndex = newIndex;
      // get dragged id for map
      const draggedID = prevState.waypoints[initIndex].id;
      // get potentional next rect for dragged waypoint so we can properly animate on drag end
      const draggedCurrRect = this.waypointsRects[newIndex];
      return {
        hasMoved,
        draggedCurrIndex,
        draggedCurrRect,
        waypoints: newWaypoints,
        mapPayload: {
          id: draggedID, // TODO: refactor to pass index
          newIndex,
          action: 'MOVE',
        },
      };
    });
  };

  handleMoveEnd = () => {
    this.setState(prevState => {
      const newWaypoints = [...prevState.waypoints];
      // move dragged waypoint to the new position
      const draggedWaypoint = newWaypoints.splice(
        this.state.draggedIndex,
        1,
      )[0];
      newWaypoints.splice(this.state.draggedCurrIndex, 0, draggedWaypoint);
      // reset transform and transition to 0 for instant render in new positions
      const transform = `translate3d(${0}px, ${0}px, 0)`;
      const transitionTime = 0;
      // update all moved waypoints
      for (
        let i = Math.min(this.state.draggedCurrIndex, this.state.draggedIndex);
        i <= Math.max(this.state.draggedCurrIndex, this.state.draggedIndex);
        i++
      ) {
        newWaypoints[i] = {
          ...newWaypoints[i],
          transform,
          transitionTime,
        };
      }
      return {
        hasMoved: false,
        isTransitioning: false,
        waypoints: newWaypoints,
      };
    });
  };

  handleMapLoad = () =>
    this.setState({
      isMapLoaded: true,
    });

  render() {
    const waypoints = this.state.waypoints.map((wp, index) => (
      <RouteWaypoint
        key={wp.id.toString()}
        index={index}
        state={wp}
        className="map-route-creation__waypoint"
        handleDelete={this.handleDelete}
        handleMoveEnd={this.handleMoveEnd}
        setDragged={this.setDragged}
        // draggedIndex={this.state.draggedIndex}
        draggedCurrRect={
          index === this.state.draggedIndex ? this.state.draggedCurrRect : null
        }
        isTransitioning={this.state.isTransitioning}
        setBaseRect={this.setBaseRect}
        updateWaypoints={this.updateWaypoints}
      />
    ));
    const waypointsClass = `map-route-creation__waypoints ${
      this.state.isDragStarted ? 'map-route-creation__waypoints_dragging' : ''
    }`;
    return (
      <Centering height="100vh">
        <div className="map-route-creation">
          <div className="map-route-creation__content">
            <RouteInput
              className="map-route-creation__input"
              handleEnter={this.handleEnter}
              placeholder="Новая точка маршрута"
              isMapLoaded={this.state.isMapLoaded}
            />
            <div className={waypointsClass}>{waypoints}</div>
            {this.state.isMaxWaypointsReached && (
              <div className="map-route-creation__warning">
                15 точек максимум
              </div>
            )}
          </div>
          <RouteMap
            className="map-route-creation__map"
            payload={this.state.mapPayload}
            onMapLoad={this.handleMapLoad}
          />
        </div>
      </Centering>
    );
  }
}
