import React from 'react';
import { shallow, mount } from 'enzyme';
import { randomString, randomNumber } from '../utility/test-utility';
import RouteWaypoint from './RouteWaypoint';
import lolex from 'lolex';

const editableFn = _value => {
  return {
    get: () => _value,
    set: v => (_value = v),
  };
};

Object.defineProperty(navigator, 'userAgent', editableFn(navigator.userAgent));

const wait = (time = 100) => new Promise(resolve => setTimeout(resolve, time));

let props = {
  state: {
    name: randomString(),
    id: randomNumber(),
    transitionTime: 555,
    style: {
      transform: '',
    },
  },
  index: randomNumber(),
  className: randomString(),
  handleDelete: jest.fn(),
  handleMoveEnd: jest.fn(),
  setWaypointDocCoord: jest.fn(),
  setDragged: jest.fn(),
  setBaseRect: jest.fn(),
  updateWaypoints: jest.fn(),
};

const options = {
  disableLifecycleMethods: true,
};

describe('RouteWaypoint', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });
  it('renders without crashing', () => {
    mount(<RouteWaypoint {...props} />);
  });

  it('renders proper markup', () => {
    let wrapper = shallow(<RouteWaypoint {...props} />, options);
    expect(wrapper.hasClass('route-waypoint')).toBe(true);
    expect(wrapper.hasClass(props.className)).toBe(true);
    expect(wrapper.children().length).toBe(1);
    const draggable = wrapper.childAt(0);
    expect(draggable.hasClass('route-waypoint__draggable')).toBe(true);
    expect(draggable.prop('style')).toHaveProperty(
      'transform',
      'translate(0px, 0px)',
    );
    expect(draggable.childAt(0).hasClass('route-waypoint__icon')).toBe(true);
    expect(draggable.childAt(1).hasClass('route-waypoint__name')).toBe(true);
    expect(draggable.childAt(1).text()).toBe(props.state.name);
    expect(draggable.childAt(2).type()).toBe('button');
    expect(draggable.childAt(2).hasClass('route-waypoint__button')).toBe(true);
  });

  it('sets right event handler for button', () => {
    const wrapper = mount(<RouteWaypoint {...props} />);
    const button = wrapper.find('.route-waypoint__button');
    expect(button.prop('onClick')).toBe(wrapper.instance().handleButtonClick);
    button.getDOMNode().dispatchEvent(new window.Event('touchstart'));
    expect(props.handleDelete).toHaveBeenCalledTimes(1);
  });

  it('attaches right refs', () => {
    let wrapper = mount(<RouteWaypoint {...props} />);
    const draggable = wrapper.find('.route-waypoint__draggable');
    expect(draggable.getDOMNode()).toBe(wrapper.instance().waypointRef.current);
    const button = wrapper.find('.route-waypoint__button');
    expect(button.getDOMNode()).toBe(wrapper.instance().buttonRef.current);
    wrapper
      .find('.route-waypoint__button')
      .getDOMNode()
      .dispatchEvent(new window.Event('touchstart'));
    expect(props.handleDelete).toHaveBeenCalledTimes(1);
    expect(props.handleDelete).toHaveBeenCalledWith(props.state.id);
  });

  it('sets right event handlers when no pointer support', () => {
    const clock = lolex.install();
    const wrapper = mount(<RouteWaypoint {...props} />);
    expect(wrapper.instance().isPointerSupported).toBe(false);
    const draggable = wrapper.find('.route-waypoint__icon');
    expect(draggable.prop('onMouseDown')).toBe(
      wrapper.instance().handleGestureStart,
    );
    expect(draggable.prop('onTouchMove')).toBe(
      wrapper.instance().handleGestureMove,
    );
    expect(draggable.prop('onTouchEnd')).toBe(
      wrapper.instance().handleGestureEnd,
    );
    const handleGestureStart = jest.spyOn(
      wrapper.instance(),
      'handleGestureStart',
    );
    wrapper.update();
    wrapper.instance().componentDidMount();
    wrapper
      .find('.route-waypoint__icon')
      .getDOMNode()
      .dispatchEvent(new window.Event('touchstart'));
    clock.next();
    expect(handleGestureStart).toHaveBeenCalledTimes(1);
    clock.uninstall();
  });

  it('sets right event handlers depending if pointer events supported', () => {
    window.PointerEvent = jest.fn();
    let wrapper = mount(<RouteWaypoint {...props} />);
    const draggable = wrapper.find('.route-waypoint__icon');
    expect(draggable.prop('onPointerDown')).toBe(
      wrapper.instance().handleGestureStart,
    );
    expect(draggable.prop('onPointerMove')).toBe(
      wrapper.instance().handleGestureMove,
    );
    expect(draggable.prop('onPointerUp')).toBe(
      wrapper.instance().handleGestureEnd,
    );
    expect(draggable.prop('onPointerCancel')).toBe(
      wrapper.instance().handleGestureEnd,
    );
    delete window.PointerEvent;
  });

  it('on mount stores rect of getBoundingClientRect in state and on parent component', () => {
    document.scrollingElement = { scrollTop: 10, scrollLeft: -5 };
    const gBCR = jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(() => ({
        top: 2,
        bottom: 1,
        left: 3,
        right: 4,
      }));
    const baseRect = { top: 12, bottom: 11, left: -2, right: -1 };
    mount(<RouteWaypoint {...props} />);
    expect(props.setBaseRect).toHaveBeenCalledTimes(1);
    expect(props.setBaseRect).toHaveBeenCalledWith(props.index, baseRect);
    gBCR.mockRestore();
  });

  it('gesture start and long touch allows dragging', async () => {
    let wrapper = mount(<RouteWaypoint {...props} />);
    wrapper.instance().handleGestureStart({ preventDefault: jest.fn() });

    expect(wrapper.instance().hasGestureStarted).toBe(true);
    expect(props.setDragged).toHaveBeenCalledTimes(0);
    await wait(wrapper.instance().longTouchWait);
    expect(wrapper.instance().isDragging).toBe(true);
    expect(props.setDragged).toHaveBeenCalledTimes(1);
    expect(props.setDragged).toHaveBeenCalledWith(props.index);
    wrapper.instance().forceUpdate();
    wrapper.update();
    expect(
      wrapper
        .find('.route-waypoint__draggable')
        .hasClass('route-waypoint__draggable_dragging'),
    ).toBe(true);
  });

  describe('gesture move', () => {
    const eventStart = {
      preventDefault: jest.fn(),
      pageX: 0,
      pageY: 0,
    };
    const eventMove = {
      preventDefault: jest.fn(),
      pageX: 8,
      pageY: 5,
    };

    const transitionVector = {
      x: eventMove.pageX - eventStart.pageX,
      y: eventMove.pageY - eventStart.pageY,
    };

    let clock;
    beforeAll(() => {
      clock = lolex.install();
    });

    afterEach(() => {
      clock.reset();
    });

    afterAll(() => {
      clock.uninstall();
    });

    it('gesture move prevents dragging if started before long touch', () => {
      let wrapper = mount(<RouteWaypoint {...props} />);
      wrapper.instance().handleGestureStart(eventStart);
      expect(clock.countTimers()).toBe(1);
      wrapper.instance().handleGestureMove(eventMove);
      expect(wrapper.instance().longTouchTimeoutID).toBeNull();
      expect(clock.countTimers()).toBe(0);
    });

    it('gesture move does not start if sloppy click', () => {
      let wrapper = mount(<RouteWaypoint {...props} />);
      wrapper.instance().moveTriggerDelta = Math.sqrt(
        Math.pow(transitionVector.x, 2) + Math.pow(transitionVector.y, 2),
      );
      wrapper.instance().handleGestureStart(eventStart);
      expect(wrapper.instance().sloppyClick).toBe(true);
      wrapper.instance().handleGestureMove(eventMove);
      expect(wrapper.instance().sloppyClick).toBe(true);
      expect(clock.countTimers()).toBe(1);
    });

    it('geture start, move and end updates state and dragging waypoint style accordingly', () => {
      const performanceNow = global.performance.now;
      global.performance.now = clock.performance.now;

      let wrapper = mount(<RouteWaypoint {...props} />);
      const documentEvents = Object.create(null);
      jest
        .spyOn(document, 'addEventListener')
        .mockImplementation((event, cb) => (documentEvents[event] = cb));
      jest
        .spyOn(document, 'removeEventListener')
        .mockImplementation((event, cb) =>
          documentEvents[event] === cb ? delete documentEvents[event] : null,
        );

      wrapper.instance().handleGestureStart(eventStart);
      expect(documentEvents['mousemove']).toBe(
        wrapper.instance().handleGestureMove,
      );
      expect(documentEvents['mouseup']).toBe(
        wrapper.instance().handleGestureEnd,
      );
      // wait long touch
      clock.next();
      expect(wrapper.instance().isDragging).toBe(true);
      wrapper.setProps({
        isTransitioning: true,
        draggedCurrRect: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      });

      const updateWaypointStyle = jest.spyOn(
        wrapper.instance(),
        'updateWaypointStyle',
      );
      wrapper.instance().handleGestureMove(eventMove);
      clock.runToFrame();
      expect(wrapper.instance().currGestureCoord).toEqual({
        x: eventMove.pageX,
        y: eventMove.pageY,
      });
      expect(wrapper.instance().sloppyClick).toBe(false);
      expect(props.updateWaypoints).toHaveBeenCalledWith(transitionVector);
      const transform = `translate3d(${transitionVector.x}px, ${
        transitionVector.y
      }px, 0)`;
      expect(updateWaypointStyle).toHaveBeenCalled();
      expect(updateWaypointStyle).toHaveBeenCalledWith(transform, 0);

      wrapper.instance().handleGestureEnd(eventMove);
      expect(Object.keys(documentEvents).length).toBe(0);
      expect(wrapper.instance().sloppyClick).toBe(true);
      expect(wrapper.instance().isDragging).toBe(false);
      expect(wrapper.instance().hasDragged).toBe(true);
      clock.tick(props.state.transitionTime);
      global.performance.now = performanceNow;
    });
  });
});
