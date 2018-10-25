import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import 'react-testing-library/cleanup-after-each';
import 'jest-dom/extend-expect';

configure({ adapter: new Adapter() });