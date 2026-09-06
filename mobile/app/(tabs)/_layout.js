import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '../../components/Icon';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

function HomeHeaderTitle() {
  return (
    <View style={styles.brand}>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.brandLogo}
        resizeMode="contain"
      />
      <Text style={styles.brandName}>My Skool Club</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const logoutButton = (
    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} accessibilityLabel="Log out">
      <MaterialCommunityIcons name="logout" size={22} color="#dc2626" />
    </TouchableOpacity>
  );
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: true,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: () => <HomeHeaderTitle />,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-star" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schools"
        options={{
          title: 'Schools',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="school" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clubs"
        options={{
          title: 'Clubs',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
          headerRight: () => logoutButton,
        }}
      />
      <Tabs.Screen name="school-requests" options={{ href: null, title: 'School Requests' }} />
      <Tabs.Screen name="accounts" options={{ href: null, title: 'Accounts' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 38,
    height: 38,
  },
  brandName: {
    color: '#2563eb',
    fontSize: 20,
    fontWeight: '700',
  },
  logoutBtn: {
    marginRight: 12,
    padding: 6,
  },
});
