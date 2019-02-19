import React from 'react';
import PropTypes from 'prop-types';

export default class RouteInput extends React.Component {
  state = {
    text: ''
  }

  inputRef = React.createRef();

  componentDidMount() {
    if (this.props.isMapLoaded) {
      this.inputRef.current.focus();
      this.inputRef.current.click();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.isMapLoaded !== this.props.isMapLoaded) {
      this.inputRef.current.focus();
      this.inputRef.current.click();
    }
  }

  handleChange = (e) => {
    this.setState({
      text: e.target.value
    });
  }

  handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.repeat && e.target.value.trim()) {
      this.props.handleEnter(e.target.value);
      this.setState({
        text: ''
      });
    }
  }

  render() {
    return (
      <div className={this.props.className}>
        <input
          type="text"
          placeholder={this.props.placeholder}
          autoComplete="off"
          autoCorrect="off"
          onChange={this.handleChange}
          onKeyDown={this.handleKeyDown}
          value={this.state.text}
          ref={this.inputRef}
          disabled={this.props.isMapLoaded ? false : true}
        />
      </div>
    );
  }
}

RouteInput.propTypes = {
  className: PropTypes.string,
  handleEnter: PropTypes.func,
  placeholder: PropTypes.string,
  isMapLoaded: PropTypes.bool
};