import React from 'react';
import './Centering.scss';

export default class Centering extends React.Component {
  render() {
    return (
      <div className="centering-outer" style={{ height: this.props.height }}>
        <div className="centering-middle">{this.props.children}</div>
      </div>
    );
  }
}
