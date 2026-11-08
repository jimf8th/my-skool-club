import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '../../components/Icon';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { accountsAdminAPI } from '../../services/api';
import { getFriendlyErrorMessage } from '../../utils/errors';

export default function AccountsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try { setAccounts(await accountsAdminAPI.search(query || undefined)); }
    catch (error) { Alert.alert('Error', getFriendlyErrorMessage(error, 'Could not load accounts.')); }
    finally { setLoading(false); setRefreshing(false); }
  }, [query]);

  useEffect(() => {
    if (user?.appRole !== 'APP_ADMIN') { router.replace('/'); return; }
    load();
  }, [load, router, user?.appRole]);

  const resetSignIn = (account) => Alert.alert(
    'Reset sign-in link',
    `Clear the Firebase sign-in link for ${account.email}? They will need to sign in again to relink.`,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: async () => {
      try { await accountsAdminAPI.resetSignIn(account.id); await load(); }
      catch (error) { Alert.alert('Error', getFriendlyErrorMessage(error, 'Could not reset sign-in.')); }
    } }]
  );

  if (user?.appRole !== 'APP_ADMIN') return null;
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Accounts</Text>
        <Text style={styles.subtitle}>Search accounts and repair a stuck Firebase sign-in link.</Text>
      </View>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by email"
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          onSubmitEditing={() => load()}
        />
        <TouchableOpacity style={styles.searchButton} onPress={() => load()} accessibilityLabel="Search">
          <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator style={styles.loader} /> : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          contentContainerStyle={styles.list}
        >
          {accounts.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-search-outline" size={38} color="#9ca3af" />
              <Text style={styles.emptyText}>No accounts found.</Text>
            </View>
          ) : accounts.map((account) => (
            <AccountCard key={account.id} account={account} onResetSignIn={() => resetSignIn(account)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function AccountCard({ account, onResetSignIn }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{account.firstName} {account.lastName}</Text>
          <Text style={styles.email}>{account.email}</Text>
        </View>
        <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{account.appRole}</Text></View>
      </View>
      <View style={styles.badgeRow}>
        {!account.enabled && <Badge label="SUSPENDED" color="#991b1b" bg="#fee2e2" />}
        {!account.signInLinked && <Badge label="SIGN-IN NOT LINKED" color="#92400e" bg="#fef3c7" />}
      </View>
      {!!account.suspensionReason && <Text style={styles.reason}>Suspension reason: {account.suspensionReason}</Text>}
      <TouchableOpacity
        style={[styles.resetButton, !account.signInLinked && styles.resetButtonDisabled]}
        disabled={!account.signInLinked}
        onPress={onResetSignIn}
        accessibilityRole="button"
        accessibilityLabel="Reset sign-in link"
      >
        <Text style={styles.resetButtonText}>Reset sign-in link</Text>
      </TouchableOpacity>
    </View>
  );
}

function Badge({ label, color, bg }) {
  return <Text style={[styles.badge, { color, backgroundColor: bg }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { padding: 18, paddingBottom: 10 },
  title: { fontSize: 26, fontWeight: '900', color: '#111827' },
  subtitle: { color: '#6b7280', marginTop: 4, lineHeight: 19 },
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', color: '#111827' },
  searchButton: { width: 44, borderRadius: 10, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  loader: { marginTop: 50 },
  list: { padding: 16, paddingTop: 0, paddingBottom: 36, gap: 13 },
  empty: { backgroundColor: '#fff', borderRadius: 18, padding: 32, alignItems: 'center' },
  emptyText: { color: '#6b7280', marginTop: 10 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 17 },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  name: { fontSize: 16, fontWeight: '800', color: '#111827' },
  email: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  roleBadge: { backgroundColor: '#eef2ff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  roleBadgeText: { fontSize: 10, fontWeight: '800', color: '#4338ca' },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  badge: { fontSize: 9, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  reason: { color: '#991b1b', marginTop: 10, fontSize: 12 },
  resetButton: { marginTop: 14, backgroundColor: '#111827', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  resetButtonDisabled: { opacity: 0.4 },
  resetButtonText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
