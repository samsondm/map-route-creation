import React from 'react';
import { shallow } from 'enzyme';
import { randomString } from '../utility/test-utility';
import MapRouteCreation from './MapRouteCreation';
import getGoogleMapsMock from '../utility/google-maps-mock';
import { render, cleanup, fireEvent } from 'react-testing-library';

/** @type {import('enzyme').ShallowWrapper} */
let wrapper;

const options = {
  disableLifecycleMethods: true,
};

// let requestAnimationFrame = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => cb());

// afterAll(() => {
//   requestAnimationFrame.mockRestore();
// });

beforeEach(() => {
  wrapper = (() => shallow(<MapRouteCreation />, options))();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('MapRouteCreation', () => {
  it('renders without crashing', () => {});

  it('renders proper markup', () => {
    expect(wrapper.name()).toBe('Centering');
    expect(wrapper.children().length).toBe(1);
    expect(wrapper.childAt(0).hasClass('map-route-creation')).toBe(true);
    expect(wrapper.childAt(0).prop('ref')).toBe(wrapper.instance().mapRouteRef);
    expect(
      wrapper.find('RouteInput').hasClass('map-route-creation__input'),
    ).toBe(true);
    expect(wrapper.find('RouteInput').prop('placeholder')).toBe(
      'Новая точка маршрута',
    );
    expect(wrapper.find('RouteWaypoint').exists()).toBe(false);
    expect(wrapper.find('RouteMap').hasClass('map-route-creation__map')).toBe(
      true,
    );
    expect(wrapper.find('RouteMap').prop('payload')).toBe(
      wrapper.state().mapPayload,
    );
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
      id: 0,
    });
    expect(wrapper.state().id).toBe(1);
    expect(wrapper.state().mapPayload).toMatchObject({ id: 0, action: 'ADD' });
  });

  it('handleDelete deletes waypoint and updates state', () => {
    addWaypoint();
    wrapper.instance().handleDelete(0);
    wrapper = wrapper.update();
    expect(wrapper.state().waypoints.length).toBe(0);
    expect(wrapper.state().mapPayload).toMatchObject({
      id: 0,
      action: 'DELETE',
    });
  });

  it('handleMapLoad sets isMapLoaded flag to true', () => {
    expect(wrapper.state().isMapLoaded).toBe(false);
    wrapper.instance().handleMapLoad();
    wrapper = wrapper.update();
    expect(wrapper.state().isMapLoaded).toBe(true);
  });

  describe('with mock waypoints', () => {
    const mockWaypointsRects = [
      {
        top: 0,
        bottom: 30,
        left: 0,
        right: 200,
      },
      {
        top: 40,
        bottom: 70,
        left: 0,
        right: 200,
      },
      {
        top: 80,
        bottom: 110,
        left: 0,
        right: 200,
      },
    ];
    const mockWaypoints = [
      {
        name: 'first waypoint',
        id: 0,
        transform: '',
        transitionTime: 100,
      },
      {
        name: 'second waypoint',
        id: 1,
        transform: '',
        transitionTime: 100,
      },
      {
        name: 'third waypoint',
        id: 2,
        transform: '',
        transitionTime: 100,
      },
    ];

    beforeEach(() => {
      wrapper.instance().waypointsRects = mockWaypointsRects;
      wrapper.setState({
        hasMoved: false,
        waypoints: mockWaypoints,
      });
      wrapper = wrapper.update();
      wrapper.instance()._isMounted = true;
    });

    describe('updateWaypoints', () => {
      const translationVector = { x: 0, y: 0 };

      it('searches for dragged on waypoint', () => {
        const findDraggedOn = jest
          .spyOn(wrapper.instance(), 'findDraggedOn')
          .mockImplementation(() => null);
        wrapper.instance().updateWaypoints(translationVector);
        expect(findDraggedOn).toHaveBeenCalledWith(translationVector);
      });

      it("moves waypoints if dragged on is found and it's not dragged current index", () => {
        const draggedOnIndex = 1;
        jest
          .spyOn(wrapper.instance(), 'findDraggedOn')
          .mockImplementation(() => draggedOnIndex);
        const handleMove = jest
          .spyOn(wrapper.instance(), 'handleMove')
          .mockImplementation(jest.fn);
        wrapper.setState({
          draggedCurrIndex: 0,
        });
        wrapper = wrapper.update();
        wrapper.instance().updateWaypoints(translationVector);
        expect(handleMove).toHaveBeenCalledWith(draggedOnIndex);
      });

      it('moves waypoints if dragged on is not found but waypoints have already moved', () => {
        const draggedIndex = 0;
        jest
          .spyOn(wrapper.instance(), 'findDraggedOn')
          .mockImplementation(() => null);
        const handleMove = jest
          .spyOn(wrapper.instance(), 'handleMove')
          .mockImplementation(jest.fn);
        wrapper.setState({
          draggedIndex,
          hasMoved: true,
        });
        wrapper = wrapper.update();
        wrapper.instance().updateWaypoints(translationVector);
        expect(handleMove).toHaveBeenCalledWith(draggedIndex);
      });
    });

    it.each`
      draggedIndex | translationVector      | draggedOnIndex
      ${0}         | ${{ x: 0, y: 0 }}      | ${null}
      ${0}         | ${{ x: 0, y: 20 }}     | ${1}
      ${0}         | ${{ x: 0, y: 61 }}     | ${2}
      ${1}         | ${{ x: 1000, y: 90 }}  | ${null}
      ${1}         | ${{ x: 100, y: -30 }}  | ${0}
      ${2}         | ${{ x: -100, y: -70 }} | ${0}
      ${2}         | ${{ x: 33, y: -35 }}   | ${1}
    `(
      'findDraggedOn returns $draggedOnIndex when waypoint with index $draggedIndex translated with $translationVector',
      ({ draggedIndex, translationVector, draggedOnIndex }) => {
        wrapper.instance().setDragged(draggedIndex);
        wrapper = wrapper.update();
        expect(wrapper.instance().findDraggedOn(translationVector)).toBe(
          draggedOnIndex,
        );
      },
    );

    it('handleMove moves waypoints', () => {
      const draggedIndex = 0;
      const newIndex = 1;
      wrapper.instance().setDragged(draggedIndex);
      wrapper = wrapper.update();
      wrapper.instance().handleMove(newIndex);
      wrapper = wrapper.update();
      const transform = `translate(${0}px, ${mockWaypointsRects[draggedIndex]
        .top - mockWaypointsRects[newIndex].top}px)`;
      const state = {
        hasMoved: true,
        draggedCurrIndex: newIndex,
        draggedCurrRect: mockWaypointsRects[newIndex],
        mapPayload: {
          id: mockWaypoints[draggedIndex].id, // TODO: refactor to pass index
          newIndex,
          action: 'MOVE',
        },
      };
      expect(wrapper.state()).toMatchObject(state);
      expect(wrapper.state().waypoints[newIndex].transform).toBe(transform);
    });
  });

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
      ({ container, getByText, getByPlaceholderText } = render(
        <MapRouteCreation />,
      ));
    });

    const addWaypointRTL = () => {
      const input = getByPlaceholderText('Новая точка маршрута');
      const waypointName = randomString();
      fireEvent.change(input, { target: { value: waypointName } });
      fireEvent.keyDown(input, { key: 'Enter' });
      return getByText(waypointName);
    };

    it('entering text into input and pressing enter will add waypoint with right name', () => {
      const waypoint = addWaypointRTL();
      expect(waypoint).not.toBeNull();
    });

    it('removes waypoint on close button', () => {
      const waypoint = addWaypointRTL();
      const button = waypoint.parentNode.querySelector('button');
      fireEvent.click(button);
      const waypoints = container.querySelector(
        '.map-route-creation__waypoints',
      );
      expect(waypoints.childNodes.length).toBe(0);
    });
  });
});
