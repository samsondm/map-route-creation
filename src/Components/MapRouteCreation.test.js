import React from 'react';
import { shallow } from 'enzyme';
import { randomString } from '../utility/test-utility';
import MapRouteCreation, { parseTransformTranslate } from './MapRouteCreation';
import getGoogleMapsMock from '../utility/google-maps-mock';
import { render, cleanup, fireEvent } from 'react-testing-library';


let wrapper;

describe('', () => {
  it.each`
 transform                        | expected
 ${''}                            | ${{ x: 0, y: 0 }}
 ${'translate(0, 0)'}             | ${{ x: 0, y: 0 }}
 ${'translate(-1px, 1px)'}        | ${{ x: -1, y: 1 }}
 ${'translate(1px, -1px)'}        | ${{ x: 1, y: -1 }}
 ${'translate(1, -1)'}            | ${{ x: 1, y: -1 }}
 ${'translate(143.111px, -10.5)'} | ${{ x: 143.111, y: -10.5 }}
 ${'translate(-17.91, 10.5)'}     | ${{ x: -17.91, y: 10.5 }}
`('parseTransformTranslate', ({ transform, expected }) => {
      expect(parseTransformTranslate(transform)).toEqual(expected);
    });
});

const options = {
  disableLifecycleMethods: true
};

let requestAnimationFrame = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => cb());

afterAll(() => {
  requestAnimationFrame.mockRestore();
});


beforeEach(() => {
  wrapper = shallow(<MapRouteCreation />, options);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('MapRouteCreation', () => {
  it('renders without crashing', () => {
  });

  it('renders proper markup', () => {
    expect(wrapper.name()).toBe('Centering');
    expect(wrapper.children().length).toBe(1);
    expect(wrapper.childAt(0).hasClass('map-route-creation')).toBe(true);
    expect(wrapper.childAt(0).prop('ref')).toBe(wrapper.instance().mapRouteRef);
    expect(wrapper.find('RouteInput').hasClass('map-route-creation__input')).toBe(true);
    expect(wrapper.find('RouteInput').prop('placeholder')).toBe("Новая точка маршрута");
    expect(wrapper.find('RouteWaypoint').exists()).toBe(false);
    expect(wrapper.find('RouteMap').hasClass('map-route-creation__map')).toBe(true);
    expect(wrapper.find('RouteMap').prop('payload')).toBe(wrapper.state().mapPayload);
  });

  let name;
  const addWaypoint = () => {
    name = randomString();
    wrapper.instance().handleEnter(name);
    wrapper = wrapper.update();
  };

  it('handleEnter adds new waypoint and updates state', () => {
    expect(wrapper.state().waypoints.length).toBe(0);
    addWaypoint();
    expect(wrapper.state().waypoints.length).toBe(1);
    expect(wrapper.state().waypoints[0]).toMatchObject({
      name,
      id: 0
    });
    expect(wrapper.state().id).toBe(1);
    expect(wrapper.state().mapPayload).toMatchObject({ id: 0, action: 'ADD' });
  });

  it('handleDelete deletes waypoint and updates state', () => {
    addWaypoint();
    wrapper.instance().handleDelete(0);
    wrapper = wrapper.update();
    expect(wrapper.state().waypoints.length).toBe(0);
    expect(wrapper.state().mapPayload).toMatchObject({ id: 0, action: 'DELETE' });

  });

  it('handleMapLoad sets isMapLoaded flag to true', () => {
    expect(wrapper.state().isMapLoaded).toBe(false);
    wrapper.instance().handleMapLoad();
    wrapper = wrapper.update();
    expect(wrapper.state().isMapLoaded).toBe(true);
  });

  describe('with mockedWaypoints', () => {
    const mockWaypoints = [
      {
        "name": "first waypoint",
        "id": 0,
        "style": {
          "transform": "",
          "WebkitTransform": "",
          "msTransform": ""
        },
        "baseRect": {
          "top": 236,
          "bottom": 268,
          "left": 7.5,
          "right": 292.5
        }
      },
      {
        "name": "second waypoint",
        "id": 1,
        "style": {
          "transform": "",
          "WebkitTransform": "",
          "msTransform": ""
        },
        "baseRect": {
          "top": 278,
          "bottom": 310,
          "left": 7.5,
          "right": 292.5
        }
      },
      {
        "name": "third waypoint",
        "id": 2,
        "style": {
          "transform": "",
          "WebkitTransform": "",
          "msTransform": ""
        },
        "baseRect": {
          "top": 320,
          "bottom": 352,
          "left": 7.5,
          "right": 292.5
        }
      }
    ];

    beforeEach(() => {
      wrapper.instance().startTouchCoord = { x: 0, y: 0 };
      wrapper.setState({
        canDragStart: true,
        isDragAnimating: false,
        draggedIndex: 0,
        waypoints: mockWaypoints
      });
      wrapper = wrapper.update();
      wrapper.instance()._isMounted = true;
    });

    it.each`
    prev                     | curr                     | times | index
    ${{ x: 10, y: 250 }}     | ${{ x: 10, y: 270 }}     |  ${0} | ${null}
    ${{ x: 10, y: 280 }}     | ${{ x: 10, y: 300 }}     |  ${1} | ${1}
    ${{ x: 0, y: 280 }}      | ${{ x: 5, y: 300 }}      |  ${0} | ${null}
    ${{ x: 10, y: 294 }}     | ${{ x: 5, y: 294 }}      |  ${0} | ${null}
    ${{ x: 7.5, y: 294 }}    | ${{ x: 7.5, y: 294 }}    |  ${1} | ${1}
    ${{ x: 292.5, y: 294 }}  | ${{ x: 292.5, y: 294 }}  |  ${1} | ${1}
    ${{ x: 292.5, y: 340 }}  | ${{ x: 292.5, y: 330 }}  |  ${1} | ${2}
    `('findDraggedOn finds dragged on waypoint and triggers handleMove if gesture moves over it center', ({ prev, curr, times, index }) => {
        const handleMove = jest.spyOn(wrapper.instance(), 'handleMove');
        wrapper.instance().findDraggedOn(prev, curr);
        expect(handleMove).toBeCalledTimes(times);
        (index !== null && expect(handleMove).toBeCalledWith(index));
      });

    it('handleMove moves dragged waypoint to new position in waypoints array and updates its state', () => {
      const newIndex = 2;
      wrapper.instance().handleMove(newIndex);
      wrapper = wrapper.update();
      const waypoints = wrapper.state().waypoints;
      expect(waypoints[newIndex]).toMatchObject({ id: 0, name: 'first waypoint', baseRect: waypoints[newIndex].baseRect });
      expect(waypoints[0].id).toBe(1);
      expect(waypoints[1].id).toBe(2);
      expect(wrapper.state().mapPayload).toMatchObject({ id: 0, newIndex, action: 'MOVE' });
    });

    it('geture start, move and end updates state and dragging waypoint style accordingly', () => {
      jest.spyOn(wrapper.instance(), 'findDraggedOn').mockImplementation(() => { });
      const documentEvents = Object.create(null);
      jest.spyOn(document, 'addEventListener').mockImplementation((event, cb) => documentEvents[event] = cb);
      jest.spyOn(document, 'removeEventListener').mockImplementation((event, cb) => documentEvents[event] === cb ? delete documentEvents[event] : null);

      const eventStart = {
        preventDefault: jest.fn(),
        pageX: 0,
        pageY: 0
      };
      wrapper.instance().handleGestureStart(eventStart);
      wrapper = wrapper.update();
      expect(wrapper.state().isDragStarted).toBe(true);
      expect(documentEvents['mousemove']).toBe(wrapper.instance().handleGestureMove);
      expect(documentEvents['mouseup']).toBe(wrapper.instance().handleGestureEnd);

      const eventMove = {
        preventDefault: jest.fn(),
        pageX: 8,
        pageY: 5
      }
      wrapper.instance().handleGestureMove(eventMove);
      wrapper = wrapper.update();
      const transform = `translate(${eventMove.pageX - eventStart.pageX}px, ${eventMove.pageY - eventStart.pageY}px)`;
      expect(wrapper.state().waypoints[0].style).toMatchObject({ transform });

      wrapper.instance().handleGestureEnd(eventMove);
      wrapper = wrapper.update();
      expect(Object.keys(documentEvents).length).toBe(0);
      const state = wrapper.state();
      expect(state.waypoints[0].style.transform).toBe('');
      expect(state).toMatchObject({ draggedIndex: null, isDragAnimating: false, canDragStart: false, isDragStarted: false });
    });
  })


  describe('integration', () => {

    let coordinatesArr = [];
    let gmm;

    beforeAll(() => {
      jest.restoreAllMocks();
      gmm = getGoogleMapsMock(coordinatesArr);
      window.google = gmm.google;
    });

    afterEach(() => {
      coordinatesArr.length = 0;
      jest.clearAllMocks();
      cleanup();
    });

    let getByText, getByPlaceholderText, container;

    beforeEach(() => {
      ({ container, getByText, getByPlaceholderText } = render(<MapRouteCreation />));
    });

    const addWaypointRTL = () => {
      const input = getByPlaceholderText("Новая точка маршрута");
      const waypointName = 'waypoint name';
      fireEvent.change(input, { target: { value: waypointName } });
      fireEvent.keyDown(input, { key: 'Enter' });
      return getByText(waypointName);
    }

    it('entering text into input and pressing enter will add waypoint with right name', () => {
      const waypoint = addWaypointRTL();
      expect(waypoint).not.toBeNull();
    });

    it('removes waypoint on close button', () => {
      const waypoint = addWaypointRTL();
      const button = waypoint.parentNode.querySelector('button');
      fireEvent.mouseDown(button);
      const waypoints = container.querySelector('.map-route-creation__waypoints')
      expect(waypoints.childNodes.length).toBe(0);
    });

  });
});