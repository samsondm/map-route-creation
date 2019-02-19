import React from 'react';
import withAbortToken from '../utility/withAbortToken';
import PropTypes from 'prop-types';
import './RouteMap.scss';
import Centering from './Centering';

export default class RouteMap extends React.Component {
  state = {
    isLoading: true,
    error: null,
    markers: [],
    map: null,
    polyline: null,
    lastAction: null,
    // viewport: {
    //   height: '',
    //   width: ''
    // }
  };
  isPolylineAnimating = false;
  // scrollingElement = document.scrollingElement || document.documentElement;

  isGoogleApiLoaded = 'google' in window;
  isGeolocationSupported = 'geolocation' in navigator;

  googleMapRef = React.createRef();
  googleMapApiKey = 'AIzaSyC-ij1b7n8H0QPCUPptFwUSFqzrTKbvXHc';

  markerColors = {
    start: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
    default: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
    end: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
  };

  getDefaultCenter() {
    return { lat: 55.7558, lng: 37.6173 };
  }

  addMarker = coordinates => {
    let icon;
    const markersCount = this.state.markers.length;
    if (!markersCount) {
      icon = this.markerColors.start;
    } else {
      icon = this.markerColors.end;
      if (markersCount !== 1) {
        this.state.markers[markersCount - 1].marker.setIcon(
          this.markerColors.default,
        );
      }
    }
    return new window.google.maps.Marker({
      position: coordinates,
      map: this.state.map,
      draggable: true,
      icon,
    });
  };

  updateMarkerIcon(markers, index) {
    if (index === 0) {
      markers[index].marker.setIcon(this.markerColors.start);
    } else if (index === markers.length - 1) {
      markers[index].marker.setIcon(this.markerColors.end);
    } else if (index < markers.length - 1) {
      markers[index].marker.setIcon(this.markerColors.default);
    }
  }

  // updateViewPortSize = () => {
  //   this.setState({
  //     viewport: {
  //       height: this.scrollingElement.clientHeight,
  //       width: this.scrollingElement.clientWidth
  //     }
  //   });
  // }

  async componentDidMount() {
    // this.updateViewPortSize();
    // window.addEventListener('resize', this.updateViewPortSize);

    this.abortToken = {
      abort: null,
    };
    this.withCancel = withAbortToken(this.abortToken);
    try {
      if (!this.isGoogleApiLoaded) {
        await this.withCancel(this.getGoogleApi());
        this.isGoogleApiLoaded = true;
      }
      let center;
      if (this.isGeolocationSupported) {
        try {
          const {
            coords: { latitude, longitude },
          } = await this.withCancel(this.getLocation());
          center = { lat: latitude, lng: longitude };
        } catch (e) {
          center = null;
        }
      }
      if (!center) center = this.getDefaultCenter();
      const options = {
        center,
        zoom: 8,
      };
      const map = new window.google.maps.Map(
        this.googleMapRef.current,
        options,
      );
      this.setState({ map });
      this.props.onMapLoad();
    } catch (error) {
      this.setState({
        error,
      });
    } finally {
      this.setState({
        isLoading: false,
      });
    }
  }

  componentWillUnmount() {
    if (this.abortToken.abort){
    this.abortToken.abort();
  }
  }

  componentDidUpdate(prevProps, prevState) {
    const { id, action, name, newIndex } = this.props.payload;
    const { id: prevID } = prevProps.payload;
    let newMarkers = null;
    if (action === 'ADD' && id !== prevID) {
      // ADD marker block
      // create and add marker to the map
      const coordinates = this.state.map.getCenter().toJSON();
      const marker = this.addMarker(coordinates);
      // add event listener to marker to animate polyline on drag
      marker.addListener('drag', () => {
        this.isPolylineAnimating = true;
        window.requestAnimationFrame(this.dragPolylineAnimation);
      });
      // create popup
      const popup = new window.google.maps.InfoWindow();
      // add popup to the marker
      marker.addListener('click', async () => {
        const coordinates = marker.getPosition().toJSON();
        const address = await this.reverseGeocode(coordinates);
        const content = `
        <div class="route-map__popup">
          <div class="route-map__popup__name">${name}</div>
          ${
            address
              ? `<div class="route-map__popup__address">${
                  address.formatted_address
                }</div>`
              : ``
          }
        </div>`;
        popup.setContent(content);
        popup.open(this.state.map, marker);
      });
      //add marker to markers array
      newMarkers = [...this.state.markers, { id, marker }];
    } else if (
      action === 'DELETE' &&
      prevState.markers.length === this.state.markers.length
    ) {
      // DELETE marker block
      const markerIndex = this.state.markers.findIndex(
        marker => marker.id === id,
      );
      if (markerIndex === -1) return;
      this.state.markers[markerIndex].marker.setMap(null);
      newMarkers = [
        ...this.state.markers.slice(0, markerIndex),
        ...this.state.markers.slice(markerIndex + 1),
      ];
      if (markerIndex === newMarkers.length && newMarkers.length !== 0) {
        // if last item has been deleted than update only last marker of a non empty array
        this.updateMarkerIcon(newMarkers, newMarkers.length - 1);
      } else if (!markerIndex && newMarkers.length !== 0) {
        // if first item has been deleted than update only first marker of a non empty array
        this.updateMarkerIcon(newMarkers, 0);
      }
    } else if (action === 'MOVE' && this.state.markers[newIndex].id !== id) {
      // MOVE marker block
      const oldIndex = this.state.markers.findIndex(m => m.id === id);
      newMarkers = [...this.state.markers];
      const draggedMarker = newMarkers.splice(oldIndex, 1)[0];
      newMarkers.splice(newIndex, 0, draggedMarker);
      for (
        let i = Math.min(oldIndex, newIndex);
        i <= Math.max(oldIndex, newIndex);
        i++
      ) {
        this.updateMarkerIcon(newMarkers, i);
      }
    }
    // get new polyline
    let polyline;
    if (
      (newMarkers && newMarkers.length !== this.state.markers.length) ||
      (action === 'MOVE' && this.state.markers[newIndex].id !== id)
    ) {
      polyline = this.updatePolyline(newMarkers);
      this.setState({
        markers: newMarkers,
        polyline,
        lastAction: action,
      });
    }
    if (this.state.lastAction === 'POLYLINE') {
      this.setState({
        lastAction: null,
      });
    }
  }

  reverseGeocode = async location => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      return await new Promise((resolve, reject) => {
        geocoder.geocode({ location: location }, (results, status) => {
          if (status === 'OK') {
            resolve(results[0]);
          } else {
            reject(status);
          }
        });
      });
    } catch (err) {
      return null;
    }
  };

  updatePolyline = markers => {
    // clear polyline
    if (this.state.polyline) this.state.polyline.setMap(null);
    // draw lines if more than 1 marker
    if (markers.length > 1) {
      // get path array
      const path = markers.map(marker => marker.marker.getPosition().toJSON());
      // create new polyline
      const polyline = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2,
      });
      polyline.setMap(this.state.map);
      return polyline;
    }
    return null;
  };

  dragPolylineAnimation = () => {
    if (!this.isPolylineAnimating) return;
    this.setState(
      prevState => {
        const polyline = this.updatePolyline(prevState.markers);
        return {
          polyline,
          lastAction: 'POLYLINE',
        };
      },
      () => (this.isPolylineAnimating = false),
    );
  };

  async getGoogleApi() {
    try {
      return await new Promise((resolve, reject) => {
        const googleApi = document.createElement('script');
        const key = this.googleMapApiKey;
        googleApi.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
        googleApi.type = 'text/javascript';
        googleApi.async = false;
        googleApi.onload = e => resolve('google api loaded');
        googleApi.onerror = e => reject(new Error(e));
        document.body.appendChild(googleApi);
      });
    } catch (err) {
      throw err;
    }
  }

  getLocation = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          location => resolve(location),
          () => reject(Error('geolocation blocked')),
        );
      });
      return position;
    } catch (err) {
      throw err;
    }
  };

  render() {
    const mapStyle =
      this.state.isLoading || this.state.error
        ? { display: 'none' }
        : { display: 'block' };
    // const mapStyle = {
    //   ...this.state.viewport
    // }
    return (
      <div className={'route-map ' + this.props.className}>
        {this.state.isLoading && (
          <Centering>
            <div className="route-map__loading">Loading</div>
          </Centering>
        )}
        {this.state.error && (
          <Centering>
            <div className="route-map__error">{this.state.error.message}</div>
          </Centering>
        )}
        <div
          className="route-map__map"
          style={mapStyle}
          ref={this.googleMapRef}
        />
      </div>
    );
  }
}

RouteMap.propTypes = {
  className: PropTypes.string,
  payload: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    action: PropTypes.string,
    newIndex: PropTypes.number,
  }),
};
