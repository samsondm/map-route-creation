import React from 'react';
import { shallow, mount } from 'enzyme';
import { randomString, randomNumber } from '../utility/test-utility';
import RouteWaypoint from './RouteWaypoint';

const editableFn = _value => {
  return {
    get: () => _value,
    set: (v) => _value = v
  };
}

Object.defineProperty(navigator, "userAgent", editableFn(navigator.userAgent));

const wait = (time = 100) => new Promise(resolve => setTimeout(resolve, time));

let props = {
  state: {
    name: randomString(),
    id: randomNumber(),
    style: {
      transform: ''
    }
  },
  index: randomNumber(),
  className: randomString(),
  handleDelete: jest.fn(),
  setWaypointDocCoord: jest.fn(),
  setDragged: jest.fn(),
  findDraggedOn: jest.fn()
}

const options = {
  disableLifecycleMethods: true
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
    expect(draggable.prop('style')).toHaveProperty('transform', '');
    expect(draggable.childAt(0).hasClass('route-waypoint__name')).toBe(true);
    expect(draggable.childAt(0).text()).toBe(props.state.name);
    expect(draggable.childAt(1).type()).toBe('button');
    expect(draggable.childAt(1).hasClass('route-waypoint__button')).toBe(true);
  });

  it('attaches right refs', () => {
    let wrapper = mount(<RouteWaypoint {...props} />);
    const draggable = wrapper.find('.route-waypoint__draggable');
    expect(draggable.getDOMNode()).toBe(wrapper.instance().waypointRef.current);
    const button = wrapper.find('.route-waypoint__button');
    expect(button.getDOMNode()).toBe(wrapper.instance().buttonRef.current);
    wrapper.find('.route-waypoint__button').getDOMNode().dispatchEvent(new window.Event('touchstart'));
    expect(props.handleDelete).toHaveBeenCalledTimes(1);
    expect(props.handleDelete).toHaveBeenCalledWith(props.state.id);
  });

  it('sets right event handlers when no pointer support', async () => {
    const wrapper = mount(<RouteWaypoint {...props} />);
    expect(wrapper.instance().isPointerSupported).toBe(false);
    const draggable = wrapper.find('.route-waypoint__draggable');
    expect(draggable.prop('onMouseDown')).toBe(wrapper.instance().handleGestureStart);
    draggable.getDOMNode().dispatchEvent(new window.Event('touchstart'));
    await wait();
    expect(props.setDragged).toHaveBeenCalledTimes(1);
    const button = wrapper.find('.route-waypoint__button');
    expect(button.prop('onMouseDown')).toBe(wrapper.instance().handleButtonClick);
    button.getDOMNode().dispatchEvent(new window.Event('touchstart'));
    expect(props.handleDelete).toHaveBeenCalledTimes(1);
  });

  it('sets right event handlers depending with pointer events supported', async () => {
    window.PointerEvent = jest.fn();
    let wrapper = mount(<RouteWaypoint {...props} />);
    expect(wrapper.instance().isPointerSupported).toBe(true);
    let draggable = wrapper.find('.route-waypoint__draggable');
    expect(draggable.prop('onPointerDown')).toBe(wrapper.instance().handleGestureStart);
    let button = wrapper.find('.route-waypoint__button');
    expect(button.prop('onPointerDown')).toBe(wrapper.instance().handleButtonClick);
    delete window.PointerEvent;
  });

  it('on mount stores rect of getBoundingClientRect in state and on parent component', () => {
    document.scrollingElement = { scrollTop: 10, scrollLeft: -5 };
    const gBCR = jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      top: 2,
      bottom: 1,
      left: 3,
      right: 4
    }));
    const baseRect = { top: 12, bottom: 11, left: -2, right: -1 }
    mount(<RouteWaypoint {...props} />);
    expect(props.setWaypointDocCoord).toHaveBeenCalledTimes(1);
    expect(props.setWaypointDocCoord).toHaveBeenCalledWith(props.index, baseRect);
    gBCR.mockRestore();
  });

  it('getDerivedStateFromProps properly updates state', async () => {
    let wrapper = mount(<RouteWaypoint {...props} />);
    expect(wrapper.state().prevIndex).toBe(props.index);
  });

  it('gesture start trigers drag ', async () => {
    let wrapper = mount(<RouteWaypoint {...props} />);
    wrapper.instance().waypointRef.current.dispatchEvent(new window.Event('touchstart'));
    await wait();
    expect(props.setDragged).toHaveBeenCalledTimes(1);
    expect(props.setDragged).toHaveBeenCalledWith(props.index);
    await wait();
    wrapper = wrapper.update();
    expect(wrapper.find('.route-waypoint__draggable').hasClass('route-waypoint__draggable_dragging')).toBe(true);
  });
});