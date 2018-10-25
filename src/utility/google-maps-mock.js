import { randomString } from './test-utility';

export default function getGoogleMapsMock(coordinatesArr) {

  const getCoordinates = () => {
    const coordinates = randomString();
    coordinatesArr.push(coordinates);
    return coordinates;
  };
  const toJSON = jest.fn(() => getCoordinates());
  const getCenter = jest.fn(() => ({
    toJSON
  }));
  const map = {
    getCenter
  };
  const Map = jest.fn(() => map);

  const popup = { content: '', open: jest.fn(), setContent: jest.fn(function (content) { this.content = content; }) };
  const InfoWindow = jest.fn(() => popup);

  const markerEventListeners = {};
  const addListener = jest.fn((eventType, callback) => markerEventListeners[eventType] = callback);

  const getPosition = jest.fn(function () { return { toJSON: () => this.position } });
  const setIcon = jest.fn(function (icon) { this.icon = icon; });
  const setMap = jest.fn();
  const Marker = jest.fn(({ icon, position }) => ({ icon, position, setIcon, addListener, getPosition, setMap }));
  const Polyline = jest.fn(() => ({ setMap }));

  const results = [{
    formatted_address: randomString()
  }];
  const Geocoder = jest.fn(() => ({
    geocode: jest.fn((coord, cb) => cb(results, 'OK'))
  }));
  return {
    getCoordinates,
    toJSON,
    getCenter,
    popup,
    map,
    markerEventListeners,
    getPosition,
    setIcon,
    setMap,
    results,
    google: {
      maps: {
        Map,
        InfoWindow,
        Marker,
        Polyline,
        Geocoder
      }
    }
  };
}