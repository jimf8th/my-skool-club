import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { MaterialCommunityIcons } from '../components/Icon';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { lightTheme } from '../theme/theme';
import '../theme/globalFont';

function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();

  // Do not mount a previously selected authenticated route until the cached
  // token has been checked with the backend.
  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={lightTheme} settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
