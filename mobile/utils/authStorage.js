import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

export async function getAuthToken() {
  const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
  if (secureToken) return secureToken;

  // One-time migration from releases that stored the JWT in AsyncStorage.
  const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
  if (legacyToken) {
    await SecureStore.setItemAsync(TOKEN_KEY, legacyToken, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
  return legacyToken;
}

export async function setAuthSession(token, user) {
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getCachedUser() {
  let raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) {
    raw = await AsyncStorage.getItem(USER_KEY);
    if (raw) {
      await SecureStore.setItemAsync(USER_KEY, raw, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      await AsyncStorage.removeItem(USER_KEY);
    }
  }
  return raw ? JSON.parse(raw) : null;
}

export async function setCachedUser(user) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearAuthSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
    AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]),
  ]);
}
