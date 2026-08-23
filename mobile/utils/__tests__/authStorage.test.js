import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  clearAuthSession,
  getAuthToken,
  getCachedUser,
  setAuthSession,
  setCachedUser,
} from '../authStorage';

const secureOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

describe('authStorage', () => {
  beforeEach(() => {
    SecureStore.getItemAsync.mockReset().mockResolvedValue(null);
    SecureStore.setItemAsync.mockReset().mockResolvedValue(undefined);
    SecureStore.deleteItemAsync.mockReset().mockResolvedValue(undefined);
  });

  describe('getAuthToken', () => {
    it('returns the SecureStore token without reading legacy storage', async () => {
      SecureStore.getItemAsync.mockResolvedValue('secure-token');

      await expect(getAuthToken()).resolves.toBe('secure-token');

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('authToken');
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('returns null when neither storage location contains a token', async () => {
      await expect(getAuthToken()).resolves.toBeNull();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('authToken');
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('migrates a legacy token into device-only SecureStore', async () => {
      await AsyncStorage.setItem('authToken', 'legacy-token');

      await expect(getAuthToken()).resolves.toBe('legacy-token');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('authToken', 'legacy-token', secureOptions);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
    });
  });

  it('stores a complete authentication session securely', async () => {
    const user = { id: 7, email: 'user@example.com' };

    await setAuthSession('token-7', user);

    expect(SecureStore.setItemAsync).toHaveBeenNthCalledWith(1, 'authToken', 'token-7', secureOptions);
    expect(SecureStore.setItemAsync).toHaveBeenNthCalledWith(2, 'authUser', JSON.stringify(user), secureOptions);
  });

  describe('getCachedUser', () => {
    it('parses a user from SecureStore', async () => {
      const user = { id: 8, firstName: 'Maya' };
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(user));

      await expect(getCachedUser()).resolves.toEqual(user);
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('returns null when no cached user exists', async () => {
      await expect(getCachedUser()).resolves.toBeNull();
    });

    it('migrates and parses a legacy cached user', async () => {
      const rawUser = JSON.stringify({ id: 9, firstName: 'Avery' });
      await AsyncStorage.setItem('authUser', rawUser);

      await expect(getCachedUser()).resolves.toEqual({ id: 9, firstName: 'Avery' });

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('authUser', rawUser, secureOptions);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authUser');
    });

    it('rejects malformed cached JSON instead of returning corrupt user data', async () => {
      SecureStore.getItemAsync.mockResolvedValue('{not-json');

      await expect(getCachedUser()).rejects.toThrow(SyntaxError);
    });
  });

  it('updates only the cached user', async () => {
    const user = { id: 11, firstName: 'Updated' };

    await setCachedUser(user);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('authUser', JSON.stringify(user), secureOptions);
  });

  it('clears secure and legacy session values together', async () => {
    await clearAuthSession();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('authToken');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('authUser');
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['authToken', 'authUser']);
  });
});
