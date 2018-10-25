import React from 'react';
import ReactDom from 'react-dom';
import App from './Components/App';

jest.mock('react-dom');

describe('index', () => {
  it('calls ReactDom.render with props', () => {
    const render = jest.spyOn(ReactDom, 'render').mockImplementation(() => jest.fn());
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    require('./index.js');
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(<App />, root);
    render.mockRestore();
  });
});