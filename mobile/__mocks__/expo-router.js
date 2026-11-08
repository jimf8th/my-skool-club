const React = require('react');

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  dismiss: jest.fn(),
  navigate: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  setParams: jest.fn(),
};

const createNavigator = () => {
  const Navigator = jest.fn(({ children }) => children);
  Navigator.Screen = jest.fn(() => null);
  Navigator.Protected = jest.fn(({ children }) => children);
  return Navigator;
};

module.exports = {
  Link: ({ children }) => children,
  Redirect: () => null,
  Stack: createNavigator(),
  Tabs: createNavigator(),
  mockRouter,
  useFocusEffect: (callback) => React.useEffect(() => callback(), [callback]),
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => '/'),
  useRouter: jest.fn(() => mockRouter),
  useSegments: jest.fn(() => []),
};
