import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useMySchool } from '../../hooks/useMySchool';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AnnouncementsModal from '../../components/AnnouncementsModal';

export default function HomeScreen() {
  const { user } = useAuth();
  const isAdmin = user?.appRole === 'APP_ADMIN';

  if (isAdmin) return <AdminHome user={user} />;
  return <UserHome user={user} />;
}

/* ─── Admin Dashboard ──────────────────────────────────────────────── */

function AdminHome({ user }) {
  const router = useRouter();

  const adminActions = [
    { icon: 'email-check',     label: 'School Requests', sub: 'Approve or reject onboarding requests', onPress: () => router.push('/school-requests'), color: '#0f766e', bg: '#f0fdfa' },
    { icon: 'school',          label: 'Manage Schools',  sub: 'Add, edit or remove schools',       onPress: () => router.push('/schools'), color: '#2563eb', bg: '#eff6ff' },
    { icon: 'account-group',   label: 'Manage Clubs',    sub: 'Oversee clubs across schools',      onPress: () => router.push('/clubs'), color: '#7c3aed', bg: '#f5f3ff' },
    { icon: 'account-multiple',label: 'Members',         sub: 'Review school and club membership', onPress: () => router.push('/schools'), color: '#059669', bg: '#ecfdf5' },
    { icon: 'bullhorn',        label: 'Announcements',   sub: 'Post updates for a school',         onPress: () => router.push('/schools'), color: '#d97706', bg: '#fffbeb' },
    { icon: 'calendar-check',  label: 'Events',          sub: 'Review and create school events',   onPress: () => router.push('/events'), color: '#dc2626', bg: '#fef2f2' },
    { icon: 'account-cog',     label: 'Account',         sub: 'Privacy, support, and account tools', onPress: () => router.push('/profile'), color: '#4b5563', bg: '#f9fafb' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Admin Hero */}
      <View style={styles.adminHero}>
        <View style={styles.adminHeroIcon}>
          <MaterialCommunityIcons name="shield-account" size={28} color="#fff" />
        </View>
        <View style={styles.adminHeroText}>
          <View style={styles.adminBadge}>
            <View style={styles.adminBadgeDot} />
            <Text style={styles.adminBadgeLabel}>App Administrator</Text>
          </View>
          <Text style={styles.adminHeroTitle}>Welcome back, {user?.firstName}!</Text>
          <Text style={styles.adminHeroSub}>You have full administrative access.</Text>
        </View>
      </View>

      {/* Admin Actions */}
      <Text style={styles.sectionTitle}>Admin Actions</Text>
      <View style={styles.adminActionList}>
        {adminActions.map((a, i) => (
          <TouchableOpacity
            key={a.label}
            style={[styles.adminActionRow, i === adminActions.length - 1 && { borderBottomWidth: 0 }]}
            onPress={a.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.adminActionIcon, { backgroundColor: a.bg }]}>
              <MaterialCommunityIcons name={a.icon} size={20} color={a.color} />
            </View>
            <View style={styles.adminActionBody}>
              <Text style={styles.adminActionTitle}>{a.label}</Text>
              <Text style={styles.adminActionSub}>{a.sub}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#d1d5db" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

/* ─── Regular User Dashboard ───────────────────────────────────────── */

function UserHome({ user }) {
  const router = useRouter();
  const { school, privileges, loading: loadingSchool } = useMySchool(user);
  const [announcementsModalVisible, setAnnouncementsModalVisible] = useState(false);

  const handleAnnouncementsPress = () => {
    if (!school) {
      Alert.alert('Join a School', 'Join a school and get approved to view announcements.');
      return;
    }
    setAnnouncementsModalVisible(true);
  };

  const actions = [
    { icon: 'school',        label: 'Browse Schools', sub: 'Find your school',          href: '/schools', color: '#2563eb', bg: '#eff6ff' },
    { icon: 'account-group',label: 'Join Clubs',      sub: 'Discover student clubs',    href: '/clubs',   color: '#7c3aed', bg: '#f5f3ff' },
    { icon: 'bullhorn',      label: 'Announcements',  sub: 'Latest news & updates',     onPress: handleAnnouncementsPress, color: '#059669', bg: '#ecfdf5' },
    { icon: 'calendar-check',label: 'Events',         sub: 'Upcoming events',           href: '/events',  color: '#dc2626', bg: '#fef2f2' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Surface style={styles.welcomeCard} elevation={0}>
        <Text style={styles.welcomeTitle}>
          {user?.firstName ? `Welcome back, ${user.firstName}! 👋` : 'Welcome to My Skool Club! 🎓'}
        </Text>
        <Text style={styles.welcomeSub}>
          Connect with your school community, join clubs, and stay updated.
        </Text>
      </Surface>

      {!loadingSchool && school && (
        <Surface style={styles.schoolCard} elevation={0}>
          <View style={styles.schoolCardIcon}>
            <MaterialCommunityIcons name="school" size={22} color="#4f46e5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.schoolCardLabel}>Your School</Text>
            <Text style={styles.schoolCardName}>{school.name}</Text>
          </View>
          {school.isAdmin && (
            <View style={styles.schoolCardBadge}>
              <Text style={styles.schoolCardBadgeText}>Admin</Text>
            </View>
          )}
        </Surface>
      )}

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionGrid}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={[styles.actionCard, { backgroundColor: a.bg }]}
            onPress={a.onPress ?? (() => router.push(a.href))}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name={a.icon} size={30} color={a.color} />
            <Text style={styles.actionTitle}>{a.label}</Text>
            <Text style={styles.actionSub}>{a.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <Surface style={styles.emptyCard} elevation={0}>
        <MaterialCommunityIcons name="inbox-outline" size={36} color="#9ca3af" />
        <Text style={styles.emptyText}>No recent activity yet. Start exploring!</Text>
      </Surface>

      {announcementsModalVisible && school && (
        <AnnouncementsModal
          schoolId={school.id}
          currentUser={user}
          canCreate={privileges.has('CREATE_ANNOUNCEMENT')}
          isSchoolAdmin={school.isAdmin}
          onClose={() => setAnnouncementsModalVisible(false)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f3f4f6' },
  scrollContent: { padding: 16, paddingBottom: 32 },

  adminHero: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: '#4f46e5', borderRadius: 20, padding: 20, marginBottom: 14,
  },
  adminHeroIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  adminHeroText:   { flex: 1 },
  adminBadge:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  adminBadgeDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
  adminBadgeLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  adminHeroTitle:  { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  adminHeroSub:    { color: 'rgba(255,255,255,0.7)', fontSize: 13 },

  adminActionList: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  adminActionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f4f6',
  },
  adminActionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  adminActionBody: { flex: 1 },
  adminActionTitle:{ fontSize: 14, fontWeight: '600', color: '#111827' },
  adminActionSub:  { fontSize: 12, color: '#6b7280', marginTop: 1 },

  welcomeCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20 },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  welcomeSub:   { fontSize: 14, color: '#6b7280', lineHeight: 20 },

  schoolCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 20,
  },
  schoolCardIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center',
  },
  schoolCardLabel: { fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' },
  schoolCardName:  { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 1 },
  schoolCardBadge: { backgroundColor: '#eef2ff', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  schoolCardBadgeText: { fontSize: 11, fontWeight: '700', color: '#4f46e5' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  actionCard: {
    width: '48%', borderRadius: 16, padding: 16, minHeight: 110,
  },
  actionTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 10 },
  actionSub:   { fontSize: 11, color: '#4b5563', marginTop: 2, lineHeight: 15 },

  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});
