import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');

  return function MockDateTimePicker(props) {
    return React.createElement(View, { ...props, testID: props.testID ?? 'date-time-picker' });
  };
});

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

// Treat Inter as already loaded in tests so screens render immediately
// instead of waiting on real (unavailable) font loading.
jest.mock('@expo-google-fonts/inter', () => ({
  useFonts: () => [true],
  Inter_400Regular: 'Inter_400Regular',
  Inter_500Medium: 'Inter_500Medium',
  Inter_600SemiBold: 'Inter_600SemiBold',
  Inter_700Bold: 'Inter_700Bold',
}));

// Firebase ESM packages cannot be transformed by Jest; use the manual mock.
jest.mock('./services/firebase');

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
  },
}));


jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialCommunityIcons: ({ name, ...props }) => React.createElement(
      Text,
      { ...props, testID: props.testID ?? `icon-${name}` },
      name
    ),
  };
});

// The app's Lucide-backed icon shim renders real SVGs, which aren't useful to
// assert against in tests. Mock it the same way `@expo/vector-icons` used to
// be mocked, so existing `icon-<name>` testID assertions keep working.
jest.mock('./components/Icon', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const MaterialCommunityIcons = ({ name, ...props }) => React.createElement(
    Text,
    { ...props, testID: props.testID ?? `icon-${name}` },
    name
  );

  return { MaterialCommunityIcons, default: MaterialCommunityIcons };
});

afterEach(async () => {
  await AsyncStorage.clear();
  jest.useRealTimers();
});
