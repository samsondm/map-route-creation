import React from 'react';
import { shallow, mount } from 'enzyme';
import RouteInput from './RouteInput';



let props, wrapper;
beforeEach(() => {
  props = {
    className: 'routeInputClassName',
    placeholder: 'routeInputPlaceholder',
    handleEnter: jest.fn(),
    isMapLoaded: false
  };
  wrapper = shallow(<RouteInput {...props} />, options);
});

let options = {
  disableLifecycleMethods: true
};
describe('RouteInput', () => {

  it('renders div with single input and right properties', () => {
    expect(wrapper.type()).toBe('div');
    expect(wrapper.hasClass(props.className)).toBe(true);
    expect(wrapper.children().length).toBe(1);
    const input = wrapper.childAt(0);
    expect(input.type()).toBe('input');
    expect(input.prop('placeholder')).toBe(props.placeholder);
    expect(input.prop('value')).toBe('');
  });

  it('input is disabled if map is not loaded', () => {
    wrapper = mount(<RouteInput {...props} />);
    const input = wrapper.find('input');
    expect(input.prop('disabled')).toBe(true);
  });

  it('input gets focus when map is loaded', () => {
    wrapper = mount(<RouteInput {...props} />);
    wrapper.setProps({
      ...props,
      isMapLoaded: true
    });
    wrapper = wrapper.update();
    const input = wrapper.find('input');
    expect(input.getDOMNode()).toBe(document.activeElement);
  });

  it('changes value on input', () => {
    const input = wrapper.find('input');
    const text = 'testText';
    input.simulate('change', { target: { value: text } });
    expect(wrapper.find('input').prop('value')).toBe(text);
  });

  it('calls handleEnter on enter click and clears input', () => {
    const input = wrapper.find('input');
    let text = '';
    input.simulate('keydown', { key: 'Enter', target: { value: text } });
    expect(props.handleEnter).toHaveBeenCalledTimes(0);

    text = 'test Text';
    input.simulate('keydown', { key: 'Enter', target: { value: text } });
    expect(props.handleEnter).toHaveBeenCalledTimes(1);
    expect(props.handleEnter).toHaveBeenCalledWith(text);
    expect(wrapper.find('input').prop('value')).toBe('');
  });
});