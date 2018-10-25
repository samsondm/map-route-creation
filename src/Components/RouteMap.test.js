import React from 'react';
import { shallow, mount } from 'enzyme';
import RouteMap from './RouteMap';
import { randomString } from '../utility/test-utility';
import getGoogleMapsMock from '../utility/google-maps-mock';

const wait = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

let props = {
  className: 'testClassName',
  onMapLoad: jest.fn(),
  payload: {
    id: null,
    newIndex: null,
    action: '',
    name: ''
  }
}
let wrapper;
const getWrapper = () => wrapper = shallow(<RouteMap {...props} />);

describe('RouteMap', () => {
  it('renders without crashing', () => {
    mount(<RouteMap {...props} />);
  });

  it('renders loading message while google map is loading', () => {
    getWrapper();
    expect(wrapper.hasClass(props.className)).toBe(true);
    expect(wrapper.children().length).toBe(2);
    const loading = wrapper.find('.route-map__loading');
    expect(loading.exists()).toBe(true);
    expect(loading.text()).toBe('Loading');
  });

  it('renders error message if google script didn\'t load', async () => {
    let googleApi = {};
    const createElement = jest.spyOn(document, 'createElement').mockImplementation(() => googleApi);
    const appendChild = jest.spyOn(document.body, 'appendChild').mockImplementation(() => googleApi.onerror());
    const getGoogleApi = jest.spyOn(RouteMap.prototype, 'getGoogleApi');
    getWrapper();
    await wait();

    expect(createElement).toHaveBeenCalledWith('script');
    expect(appendChild).toHaveBeenCalledWith(googleApi);
    expect(appendChild).toHaveBeenCalled();
    expect(getGoogleApi).toHaveBeenCalledTimes(1);
    expect(wrapper.children().length).toBe(2);
    expect(wrapper.find('.route-map__error').exists()).toBe(true);
    expect(wrapper.childAt(1).prop('style')).toHaveProperty('display', 'none');

    jest.restoreAllMocks();
  });

  it('sets flag that google api is loaded and global onMapLoad flag on load', async () => {
    let googleApi = {};
    jest.spyOn(document, 'createElement').mockImplementation(() => googleApi);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => googleApi.onload());
    jest.spyOn(RouteMap.prototype, 'getGoogleApi');
    getWrapper();
    expect(wrapper.instance().getGoogleApi).toHaveBeenCalled()
    expect(wrapper.instance().isGoogleApiLoaded).toBe(false);
    await wait();
    expect(wrapper.instance().isGoogleApiLoaded).toBe(true);
    jest.restoreAllMocks();
  });

  it('sets global flag onMapLoad on map load', async () => {
    const Map = jest.fn();
    window.google = {
      maps: {
        Map
      }
    };
    getWrapper();
    await wait();
    expect(Map).toHaveBeenCalled();
    expect(props.onMapLoad).toHaveBeenCalled();
  })

  it('uses default centering location if geolocation is\'t supported or blocked', async () => {
    const Map = jest.fn();
    window.google = {
      maps: {
        Map
      }
    };
    const center = {};
    const getDefaultCenter = jest.spyOn(RouteMap.prototype, 'getDefaultCenter').mockReturnValue(center)
    async function check() {
      getWrapper();
      await wait();
      expect(getDefaultCenter).toHaveBeenCalledTimes(1);
      expect(Map).toHaveBeenCalledTimes(1);
      expect(Map.mock.calls[0][1].center).toBe(center);
      expect(wrapper.children().length).toBe(1);
      expect(wrapper.find('.route-map__map').prop('style')).toHaveProperty('display', 'block');
    }
    await check();

    window.navigator.geolocation = {
      getCurrentPosition: jest.fn((successCb, failCb) => failCb())
    };
    Map.mockClear();
    getDefaultCenter.mockClear();
    await check();

    getDefaultCenter.mockRestore();
  });

  it('uses your current location if geolocatoin is supported', async () => {
    const Map = jest.fn();
    window.google = {
      maps: {
        Map
      }
    };
    const [latitude, longitude] = [1.1, -0.5];
    const currLocation = { coords: { latitude, longitude } };
    window.navigator.geolocation = {
      getCurrentPosition: jest.fn((successCb, failCb) => successCb(currLocation))
    };
    getWrapper();
    await wait();
    expect(Map).toHaveBeenCalledTimes(1);
    expect(Map.mock.calls[0][1].center).toEqual({ lat: latitude, lng: longitude });
    expect(wrapper.children().length).toBe(1);
    expect(wrapper.find('.route-map__map').prop('style')).toHaveProperty('display', 'block');
  });

  describe('updates markers state', () => {
    let coordinatesArr = [];
    let requestAnimationFrame;
    const gmm = getGoogleMapsMock(coordinatesArr);
    beforeAll(() => {
      window.google = gmm.google;
      requestAnimationFrame = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => cb());
    });

    afterAll(() => {
      requestAnimationFrame.mockRestore();
    });
    let id, icons;
    beforeEach(async () => {
      coordinatesArr.length = 0;
      id = 0;
      getWrapper();
      icons = wrapper.instance().markerColors;
      await wait();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    const addMarkers = async (number = 1) => {
      for (let i = 0; i < number; i++) {
        const props = {
          payload: {
            action: 'ADD',
            id,
            name: randomString(),
          }
        };
        wrapper.setProps(props);
        id += 1;
        await wait();
      }
    };

    async function deleteMarker(id) {
      const props = {
        payload: {
          action: 'DELETE',
          id
        }
      };
      wrapper.setProps(props);
      await wait();
    };

    async function moveMarker(id, newIndex) {
      const props = {
        payload: {
          action: 'MOVE',
          id,
          newIndex
        }
      };
      wrapper.setProps(props);
      await wait();
    }


    it('ADD action adds markers with right icons', async () => {
      expect(gmm.google.maps.Map).toHaveBeenCalledTimes(1);
      expect(wrapper.state().map).toBe(gmm.map);
      await addMarkers();
      expect(gmm.google.maps.Marker).toHaveBeenCalledWith({ position: coordinatesArr[0], map: gmm.map, draggable: true, icon: icons.start });
      let { markers, polyline } = wrapper.state();
      expect(markers.length).toBe(1);
      expect(markers[0].id).toBe(id - 1);
      expect(polyline).toEqual(null);

      gmm.markerEventListeners['click']();
      await wait();
      expect(gmm.popup.setContent).toHaveBeenCalledTimes(1);
      expect(gmm.popup.content).toMatch(props.payload.name);
      expect(gmm.popup.content).toMatch(gmm.results[0].formatted_address);
      expect(gmm.popup.open).toHaveBeenCalledTimes(1);
      expect(gmm.popup.open).toHaveBeenCalledWith(gmm.map, markers[0].marker);
      const dragPolylineAnimation = jest.spyOn(wrapper.instance(), 'dragPolylineAnimation');
      gmm.markerEventListeners['drag']();
      expect(dragPolylineAnimation).toHaveBeenCalledTimes(1);

      await addMarkers();
      ({ markers } = wrapper.state());
      expect(gmm.google.maps.Marker).toHaveBeenCalledWith({ position: coordinatesArr[1], map: gmm.map, draggable: true, icon: icons.end });
      expect(markers.length).toBe(2);
      expect(markers[1].id).toBe(1);
      expect(gmm.google.maps.Polyline).toHaveBeenCalledTimes(1);
      expect(gmm.google.maps.Polyline.mock.calls[0][0].path).toEqual(coordinatesArr);

      await addMarkers();
      ({ markers } = wrapper.state());
      expect(gmm.google.maps.Marker).toHaveBeenCalledWith({ position: coordinatesArr[2], map: gmm.map, draggable: true, icon: icons.end });
      expect(gmm.setIcon).toHaveBeenCalledTimes(1);
      expect(gmm.setIcon).toHaveBeenCalledWith(icons.default);
      expect(markers[1].marker.icon).toBe(icons.default);
    });

    it('DELETE action delete marker', async () => {
      await wait();
      await addMarkers();
      await deleteMarker(0);
      const { markers } = wrapper.state();
      expect(markers.length).toBe(0);
      expect(wrapper.state().polyline).toEqual(null);
    });

    it('deleting first marker changes next marker color to start', async () => {
      await addMarkers(3);
      await deleteMarker(0);
      const { markers } = wrapper.state();
      expect(markers.length).toBe(2);
      expect(markers[0]).toMatchObject({ id: 1, marker: { icon: icons.start } });
    });

    it('deleting non edge doesn\'t change edge colors', async () => {
      await addMarkers(3);
      await deleteMarker(1);
      const { markers } = wrapper.state();
      expect(markers.length).toBe(2);
      expect(markers[0]).toMatchObject({ id: 0, marker: { icon: icons.start } });
      expect(markers[1]).toMatchObject({ id: 2, marker: { icon: icons.end } });
    });


    it('deleting last marker changes previous marker color to end', async () => {
      await addMarkers(3);
      await deleteMarker(2);
      const { markers } = wrapper.state();
      expect(markers.length).toBe(2);
      expect(markers[0]).toMatchObject({ id: 0, marker: { icon: icons.start } });
      expect(markers[1]).toMatchObject({ id: 1, marker: { icon: icons.end } });
    });

    it('MOVE action moves markers', async () => {
      let markers;
      const getPositions = (markers) => markers.map(marker => marker.marker.position);
      await addMarkers(3);
      gmm.google.maps.Polyline.mockClear();
      await moveMarker(0, 2);
      ({ markers } = wrapper.state());
      expect(markers[0]).toMatchObject({ id: 1, marker: { icon: icons.start } });
      expect(markers[1]).toMatchObject({ id: 2, marker: { icon: icons.default } });
      expect(markers[2]).toMatchObject({ id: 0, marker: { icon: icons.end } });
      expect(gmm.google.maps.Polyline).toHaveBeenCalledTimes(1);
      expect(gmm.google.maps.Polyline.mock.calls[0][0].path).toEqual(getPositions(markers));
      await wait();
      await moveMarker(0, 1);
      ({ markers } = wrapper.state());
      expect(markers[0]).toMatchObject({ id: 1, marker: { icon: icons.start } });
      expect(markers[1]).toMatchObject({ id: 0, marker: { icon: icons.default } });
      expect(markers[2]).toMatchObject({ id: 2, marker: { icon: icons.end } });
      expect(gmm.google.maps.Polyline).toHaveBeenCalledTimes(2);
      expect(gmm.google.maps.Polyline.mock.calls[1][0].path).toEqual(getPositions(markers));
      await wait();
      await moveMarker(0, 0);
      ({ markers } = wrapper.state());
      expect(markers[0]).toMatchObject({ id: 0, marker: { icon: icons.start } });
      expect(markers[1]).toMatchObject({ id: 1, marker: { icon: icons.default } });
      expect(markers[2]).toMatchObject({ id: 2, marker: { icon: icons.end } });
      expect(gmm.google.maps.Polyline).toHaveBeenCalledTimes(3);
      expect(gmm.google.maps.Polyline.mock.calls[2][0].path).toEqual(getPositions(markers));
    });
  });


});
