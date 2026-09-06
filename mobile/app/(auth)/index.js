import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '../../components/Icon';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  openAbout,
  openCommunityStandards,
  openPrivacyPolicy,
  openTerms,
} from '../../utils/legalLinks';

const FEATURES = [
  {
    icon: 'account-group-outline',
    color: '#2563eb',
    background: '#dbeafe',
    title: 'Find your people',
    body: 'Join your school, discover clubs, and turn shared interests into a real community.',
  },
  {
    icon: 'calendar-heart',
    color: '#db2777',
    background: '#fce7f3',
    title: 'Never miss a moment',
    body: 'See announcements, explore upcoming events, and RSVP while plans are still fresh.',
  },
  {
    icon: 'chart-box-outline',
    color: '#7c3aed',
    background: '#ede9fe',
    title: 'Run clubs with clarity',
    body: 'Give organizers thoughtful tools for members, invoices, receipts, and inventory.',
  },
];

const TRUST_ITEMS = [
  ['shield-check-outline', 'Role-based access'],
  ['flag-outline', 'Built-in reporting'],
  ['account-lock-outline', 'Private by design'],
];

export default function PublicHomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.hero}>
          <View style={[styles.orb, styles.orbOne]} />
          <View style={[styles.orb, styles.orbTwo]} />
          <SafeAreaView edges={['top']} style={styles.safeTop}>
            <View style={styles.brandRow}>
              <View style={styles.logoFrame}>
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
                  accessibilityLabel="My Skool Club logo"
                />
              </View>
              <Text style={styles.brandName}>My Skool Club</Text>
            </View>

            <View style={styles.heroCopy}>
              <View style={styles.eyebrow}>
                <View style={styles.eyebrowDot} />
                <Text style={styles.eyebrowText}>YOUR SCHOOL, IN SYNC</Text>
              </View>
              <Text style={styles.heroTitle}>School life,{`\n`}beautifully organized.</Text>
              <Text style={styles.heroBody}>
                One welcoming place for the people, clubs, events, and everyday details
                that make a school community feel alive.
              </Text>

              <View style={styles.heroActions}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => router.push('/login')}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in to My Skool Club"
                >
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                  <MaterialCommunityIcons name="arrow-right" size={19} color="#312e81" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => router.push('/register')}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Create a My Skool Club account"
                >
                  <Text style={styles.secondaryButtonText}>Create Account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => router.push('/request-school')}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Request your school"
                >
                  <Text style={styles.secondaryButtonText}>Request Your School</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.previewWrap}>
              <View style={styles.previewGlow} />
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View>
                    <Text style={styles.previewLabel}>THIS WEEK</Text>
                    <Text style={styles.previewTitle}>Your school, at a glance</Text>
                  </View>
                  <View style={styles.avatarStack}>
                    <View style={[styles.miniAvatar, { backgroundColor: '#f59e0b' }]}>
                      <Text style={styles.miniAvatarText}>MJ</Text>
                    </View>
                    <View style={[styles.miniAvatar, styles.avatarOverlap, { backgroundColor: '#ec4899' }]}>
                      <Text style={styles.miniAvatarText}>AK</Text>
                    </View>
                    <View style={[styles.miniAvatar, styles.avatarOverlap, { backgroundColor: '#2563eb' }]}>
                      <Text style={styles.miniAvatarText}>+8</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.eventCard}>
                  <View style={styles.dateTile}>
                    <Text style={styles.dateMonth}>SEP</Text>
                    <Text style={styles.dateDay}>18</Text>
                  </View>
                  <View style={styles.eventCopy}>
                    <Text style={styles.eventName}>Fall Club Fair</Text>
                    <View style={styles.eventMetaRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={14} color="#64748b" />
                      <Text style={styles.eventMeta}>Main courtyard · 3:30 PM</Text>
                    </View>
                  </View>
                  <View style={styles.goingBadge}>
                    <Text style={styles.goingText}>Going</Text>
                  </View>
                </View>

                <View style={styles.announcementCard}>
                  <View style={styles.announcementIcon}>
                    <MaterialCommunityIcons name="bullhorn-outline" size={18} color="#7c3aed" />
                  </View>
                  <View style={styles.announcementCopy}>
                    <Text style={styles.announcementLabel}>NEW ANNOUNCEMENT</Text>
                    <Text style={styles.announcementTitle}>Volunteer sign-ups are open</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          <View style={styles.intro}>
            <Text style={styles.sectionKicker}>MORE THAN A NOTICEBOARD</Text>
            <Text style={styles.sectionTitle}>A calmer way to stay connected.</Text>
            <Text style={styles.sectionBody}>
              My Skool Club keeps community life easy to find and simple to manage—so
              everyone can spend less time chasing updates and more time participating.
            </Text>
          </View>

          <View style={styles.featureList}>
            {FEATURES.map((feature, index) => (
              <View key={feature.title} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: feature.background }]}>
                  <MaterialCommunityIcons name={feature.icon} size={24} color={feature.color} />
                </View>
                <View style={styles.featureCopy}>
                  <Text style={styles.featureNumber}>0{index + 1}</Text>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureBody}>{feature.body}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.rolesCard}>
            <View style={[styles.orb, styles.rolesOrb]} />
            <View style={styles.rolesIcon}>
              <MaterialCommunityIcons name="school-outline" size={28} color="#ffffff" />
            </View>
            <Text style={styles.rolesKicker}>ONE COMMUNITY. EVERY ROLE.</Text>
            <Text style={styles.rolesTitle}>Simple for members.{`\n`}Powerful for organizers.</Text>
            <Text style={styles.rolesBody}>
              Members see what matters to them. School and club leaders get permission-based
              tools that make thoughtful administration feel effortless.
            </Text>
          </View>

          <View style={styles.trustRow}>
            {TRUST_ITEMS.map(([icon, label]) => (
              <View key={label} style={styles.trustItem}>
                <MaterialCommunityIcons name={icon} size={19} color="#4f46e5" />
                <Text style={styles.trustText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.finalCard}>
            <View style={styles.finalIconRow}>
              <View style={[styles.finalIcon, { backgroundColor: '#dbeafe' }]}>
                <MaterialCommunityIcons name="school" size={22} color="#2563eb" />
              </View>
              <View style={[styles.finalIcon, styles.finalIconOverlap, { backgroundColor: '#fce7f3' }]}>
                <MaterialCommunityIcons name="heart" size={20} color="#db2777" />
              </View>
              <View style={[styles.finalIcon, styles.finalIconOverlap, { backgroundColor: '#ede9fe' }]}>
                <MaterialCommunityIcons name="account-group" size={21} color="#7c3aed" />
              </View>
            </View>
            <Text style={styles.finalTitle}>Your community is waiting.</Text>
            <Text style={styles.finalBody}>
              Create an account, find your school, and discover where you belong.
            </Text>
            <TouchableOpacity
              style={styles.finalButton}
              onPress={() => router.push('/register')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Get started with My Skool Club"
            >
              <Text style={styles.finalButtonText}>Get Started</Text>
              <MaterialCommunityIcons name="arrow-up-right" size={18} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/login')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Already a member? Sign in"
            >
              <Text style={styles.memberLink}>Already a member? Sign in</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={openAbout} accessibilityRole="link" accessibilityLabel="About My Skool Club">
              <Text style={styles.footerLink}>About</Text>
            </TouchableOpacity>
            <View style={styles.footerDot} />
            <TouchableOpacity onPress={openTerms} accessibilityRole="link">
              <Text style={styles.footerLink}>Terms</Text>
            </TouchableOpacity>
            <View style={styles.footerDot} />
            <TouchableOpacity onPress={openPrivacyPolicy} accessibilityRole="link">
              <Text style={styles.footerLink}>Privacy</Text>
            </TouchableOpacity>
            <View style={styles.footerDot} />
            <TouchableOpacity onPress={openCommunityStandards} accessibilityRole="link">
              <Text style={styles.footerLink}>Community Standards</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerNote}>Made for school communities, ages 13 and up.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingBottom: 34 },
  hero: {
    overflow: 'hidden',
    backgroundColor: '#312e81',
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  safeTop: { paddingHorizontal: 20, paddingBottom: 34 },
  orb: { position: 'absolute', borderRadius: 999 },
  orbOne: {
    width: 280,
    height: 280,
    top: -120,
    right: -130,
    backgroundColor: 'rgba(129, 140, 248, 0.22)',
  },
  orbTwo: {
    width: 190,
    height: 190,
    top: 260,
    left: -120,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  logoFrame: {
    width: 42,
    height: 42,
    padding: 3,
    borderRadius: 13,
    backgroundColor: '#ffffff',
  },
  logo: { width: '100%', height: '100%', borderRadius: 10 },
  brandName: { marginLeft: 10, color: '#ffffff', fontSize: 19, fontWeight: '800' },
  heroCopy: { marginTop: 42 },
  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fbbf24', marginRight: 7 },
  eyebrowText: { color: '#e0e7ff', fontSize: 10, fontWeight: '800', letterSpacing: 1.25 },
  heroTitle: {
    marginTop: 18,
    color: '#ffffff',
    fontSize: 41,
    lineHeight: 45,
    fontWeight: '900',
    letterSpacing: -1.3,
  },
  heroBody: { marginTop: 16, color: '#c7d2fe', fontSize: 16, lineHeight: 24, maxWidth: 520 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 26 },
  primaryButton: {
    minWidth: 145,
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#fbbf24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  primaryButtonText: { color: '#312e81', fontSize: 15, fontWeight: '900' },
  secondaryButton: {
    minWidth: 155,
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  previewWrap: { marginTop: 34, position: 'relative' },
  previewGlow: {
    position: 'absolute',
    left: 22,
    right: 22,
    top: 16,
    bottom: -10,
    borderRadius: 26,
    backgroundColor: 'rgba(129,140,248,0.35)',
  },
  previewCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 17 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLabel: { color: '#6366f1', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  previewTitle: { color: '#0f172a', fontSize: 17, fontWeight: '800', marginTop: 2 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  miniAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlap: { marginLeft: -9 },
  miniAvatarText: { color: '#ffffff', fontSize: 9, fontWeight: '900' },
  eventCard: {
    marginTop: 16,
    padding: 12,
    borderRadius: 17,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTile: {
    width: 48,
    height: 52,
    borderRadius: 13,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: { color: '#6366f1', fontSize: 9, fontWeight: '900' },
  dateDay: { color: '#312e81', fontSize: 20, lineHeight: 22, fontWeight: '900' },
  eventCopy: { flex: 1, marginLeft: 12 },
  eventName: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  eventMeta: { color: '#64748b', fontSize: 10, marginLeft: 2 },
  goingBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  goingText: { color: '#15803d', fontSize: 9, fontWeight: '800' },
  announcementCard: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ede9fe',
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
  },
  announcementIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementCopy: { flex: 1, marginLeft: 10 },
  announcementLabel: { color: '#7c3aed', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  announcementTitle: { color: '#1e293b', fontSize: 12, fontWeight: '700', marginTop: 2 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 20 },
  intro: { alignItems: 'center', paddingTop: 54, paddingHorizontal: 4 },
  sectionKicker: { color: '#4f46e5', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginTop: 9,
  },
  sectionBody: { color: '#64748b', fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 13 },
  featureList: { marginTop: 30, gap: 12 },
  featureCard: {
    minHeight: 145,
    padding: 18,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
  },
  featureIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  featureCopy: { flex: 1, marginLeft: 15 },
  featureNumber: { color: '#cbd5e1', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  featureTitle: { color: '#0f172a', fontSize: 18, fontWeight: '800', marginTop: 2 },
  featureBody: { color: '#64748b', fontSize: 13, lineHeight: 20, marginTop: 6 },
  rolesCard: {
    overflow: 'hidden',
    marginTop: 38,
    padding: 24,
    borderRadius: 26,
    backgroundColor: '#0f172a',
  },
  rolesOrb: { width: 190, height: 190, right: -85, bottom: -95, backgroundColor: 'rgba(99,102,241,0.26)' },
  rolesIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolesKicker: { color: '#a5b4fc', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 20 },
  rolesTitle: { color: '#ffffff', fontSize: 25, lineHeight: 31, fontWeight: '900', marginTop: 7 },
  rolesBody: { color: '#cbd5e1', fontSize: 14, lineHeight: 22, marginTop: 12 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 9, marginTop: 22 },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
  },
  trustText: { color: '#4338ca', fontSize: 10, fontWeight: '800', marginLeft: 5 },
  finalCard: { alignItems: 'center', marginTop: 44, padding: 26, borderRadius: 26, backgroundColor: '#ffffff' },
  finalIconRow: { flexDirection: 'row', alignItems: 'center' },
  finalIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalIconOverlap: { marginLeft: -8 },
  finalTitle: { color: '#0f172a', fontSize: 25, fontWeight: '900', textAlign: 'center', marginTop: 18 },
  finalBody: { color: '#64748b', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  finalButton: {
    minHeight: 51,
    minWidth: 170,
    borderRadius: 16,
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 21,
    paddingHorizontal: 22,
  },
  finalButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  memberLink: { color: '#4f46e5', fontSize: 13, fontWeight: '700', marginTop: 16 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  footerLink: { color: '#475569', fontSize: 11, fontWeight: '700', padding: 7 },
  footerDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#cbd5e1' },
  footerNote: { color: '#94a3b8', fontSize: 10, textAlign: 'center', marginTop: 5 },
});
