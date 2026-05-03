import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

import { AuthProvider, useAuth } from './context/AuthContext';
import { colors, spacing, typography } from './constants/theme';
import { authAPI } from './services/api';

const NotificationContext = React.createContext({ appointments: 0, leases: 0, bills: 0, maintenance: 0, notices: 0, clearBadge: () => { } });

// Auth Screens
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';

// Owner Screens
import OwnerDashboard from './screens/owner/OwnerDashboard';
import MyPropertiesScreen from './screens/owner/MyPropertiesScreen';
import AddEditPropertyScreen from './screens/owner/AddEditPropertyScreen';
import AppointmentsOwnerScreen from './screens/owner/AppointmentsOwnerScreen';
import LeasesOwnerScreen from './screens/owner/LeasesOwnerScreen';
import BillingOwnerScreen from './screens/owner/BillingOwnerScreen';
import MaintenanceOwnerScreen from './screens/owner/MaintenanceOwnerScreen';
import NoticesOwnerScreen from './screens/owner/NoticesOwnerScreen';
import AddEditNoticeScreen from './screens/owner/AddEditNoticeScreen';
import ProfileScreen from './screens/shared/ProfileScreen';

// Tenant Screens
import TenantDashboard from './screens/tenant/TenantDashboard';
import PropertyExplorerScreen from './screens/tenant/PropertyExplorerScreen';
import PropertyDetailScreen from './screens/tenant/PropertyDetailScreen';
import ScheduleAppointmentScreen from './screens/tenant/ScheduleAppointmentScreen';
import RequestLeaseScreen from './screens/tenant/RequestLeaseScreen';
import AppointmentsTenantScreen from './screens/tenant/AppointmentsTenantScreen';
import LeasesTenantScreen from './screens/tenant/LeasesTenantScreen';
import BillingTenantScreen from './screens/tenant/BillingTenantScreen';
import MaintenanceTenantScreen from './screens/tenant/MaintenanceTenantScreen';
import NoticeBoardScreen from './screens/tenant/NoticeBoardScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICON = {
  Dashboard: { active: 'grid', inactive: 'grid-outline' },
  Properties: { active: 'home', inactive: 'home-outline' },
  Appointments: { active: 'calendar', inactive: 'calendar-outline' },
  More: { active: 'apps', inactive: 'apps-outline' },
  Explorer: { active: 'search', inactive: 'search-outline' },
  Notices: { active: 'megaphone', inactive: 'megaphone-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

const screenOpts = { headerShown: false };

// ─── Owner Tab Navigator ────────────────────────────────────────────────────
function OwnerStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="MyProperties" component={MyPropertiesScreen} />
      <Stack.Screen name="AddEditProperty" component={AddEditPropertyScreen} />
    </Stack.Navigator>
  );
}

function OwnerTabs() {
  const insets = useSafeAreaInsets();
  const counts = React.useContext(NotificationContext);
  const moreCount = counts.leases + counts.bills + counts.maintenance;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: 64 + Math.max(insets.bottom, 10), paddingBottom: Math.max(insets.bottom, 10) }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outline,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICON[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
          return <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={OwnerDashboardStack} />
      <Tab.Screen name="Properties" component={OwnerStack} />
      <Tab.Screen name="Appointments" component={AppointmentsOwnerScreen} options={{ tabBarBadge: counts.appointments > 0 ? counts.appointments : null }} />
      <Tab.Screen name="More" component={OwnerMoreStack} options={{ tabBarBadge: moreCount > 0 ? moreCount : null }} />
    </Tab.Navigator>
  );
}

function OwnerDashboardStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="OwnerDashboard" component={OwnerDashboard} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function OwnerMoreStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="OwnerMore" component={OwnerMoreScreen} />
      <Stack.Screen name="Leases" component={LeasesOwnerScreen} />
      <Stack.Screen name="Billing" component={BillingOwnerScreen} />
      <Stack.Screen name="Maintenance" component={MaintenanceOwnerScreen} />
      <Stack.Screen name="Notices" component={NoticesOwnerScreen} />
      <Stack.Screen name="AddEditNotice" component={AddEditNoticeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

// ─── Tenant Tab Navigator ───────────────────────────────────────────────────
function TenantMoreStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="TenantMore" component={TenantMoreScreen} />
      <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
      <Stack.Screen name="Leases" component={LeasesTenantScreen} />
      <Stack.Screen name="RequestLease" component={RequestLeaseScreen} />
      <Stack.Screen name="Billing" component={BillingTenantScreen} />
      <Stack.Screen name="Maintenance" component={MaintenanceTenantScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function TenantExplorerStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="PropertyExplorer" component={PropertyExplorerScreen} />
      <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
      <Stack.Screen name="ScheduleAppointment" component={ScheduleAppointmentScreen} />
      <Stack.Screen name="RequestLease" component={RequestLeaseScreen} />
    </Stack.Navigator>
  );
}

function TenantDashboardStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="TenantDashboard" component={TenantDashboard} />
      <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function TenantTabs() {
  const insets = useSafeAreaInsets();
  const counts = React.useContext(NotificationContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: 64 + Math.max(insets.bottom, 10), paddingBottom: Math.max(insets.bottom, 10) }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outline,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICON[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
          return <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={TenantDashboardStack} />
      <Tab.Screen name="Explorer" component={TenantExplorerStack} />
      <Tab.Screen name="Appointments" component={AppointmentsTenantStack} options={{ tabBarBadge: counts.appointments > 0 ? counts.appointments : null }} />
      <Tab.Screen name="Notices" component={NoticeBoardScreen} options={{ tabBarBadge: counts.notices > 0 ? counts.notices : null }} />
      <Tab.Screen name="More" component={TenantMoreStack} />
    </Tab.Navigator>
  );
}

function AppointmentsTenantStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="AppointmentsTenant" component={AppointmentsTenantScreen} />
    </Stack.Navigator>
  );
}

// ─── More screens (placeholder components defined inline) ──────────────────
function OwnerMoreScreen({ navigation }) {
  const { logout } = useAuth();
  const counts = React.useContext(NotificationContext);
  const items = [
    { label: 'Leases & Contracts', icon: 'document-text', screen: 'Leases', badge: counts.leases },
    { label: 'Billing & Payments', icon: 'card', screen: 'Billing', badge: counts.bills },
    { label: 'Maintenance', icon: 'build', screen: 'Maintenance', badge: counts.maintenance },
    { label: 'Notice Board', icon: 'megaphone', screen: 'Notices' },
    { label: 'Profile', icon: 'person', screen: 'Profile' },
  ];
  return <MoreMenu items={items} navigation={navigation} onLogout={logout} />;
}

function TenantMoreScreen({ navigation }) {
  const { logout } = useAuth();
  const items = [
    { label: 'Lease & Contracts', icon: 'document-text', screen: 'Leases' },
    { label: 'Billing & Payments', icon: 'card', screen: 'Billing' },
    { label: 'Maintenance', icon: 'build', screen: 'Maintenance' },
    { label: 'Profile', icon: 'person', screen: 'Profile' },
  ];
  return <MoreMenu items={items} navigation={navigation} onLogout={logout} />;
}

import { TouchableOpacity, ScrollView } from 'react-native';
function MoreMenu({ items, navigation, onLogout }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.margin, paddingTop: 60 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', color: colors.onSurface, marginBottom: spacing.xl }}>More</Text>
      {items.map((item) => (
        <TouchableOpacity
          key={item.screen}
          style={styles.moreItem}
          onPress={() => navigation.navigate(item.screen)}
          activeOpacity={0.7}
        >
          <View style={styles.moreIcon}>
            <Ionicons name={item.icon} size={22} color={colors.primary} />
          </View>
          <Text style={styles.moreLabel}>{item.label}</Text>
          {item.badge > 0 && (
            <View style={styles.badgeCircle}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.outline} />
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={[styles.moreItem, { marginTop: spacing.xl, borderColor: colors.errorContainer }]} onPress={onLogout} activeOpacity={0.7}>
        <View style={[styles.moreIcon, { backgroundColor: colors.errorContainer }]}>
          <Ionicons name="log-out" size={22} color={colors.error} />
        </View>
        <Text style={[styles.moreLabel, { color: colors.error }]}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Root Navigator ─────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useAuth();
  const [badgeCounts, setBadgeCounts] = React.useState({ appointments: 0, leases: 0, bills: 0, maintenance: 0, notices: 0 });

  const clearBadge = React.useCallback((type) => {
    setBadgeCounts(prev => ({ ...prev, [type]: 0 }));
  }, []);

  React.useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      try {
        const { data } = await authAPI.getNotifications();
        setBadgeCounts(data || { appointments: 0, leases: 0, bills: 0, maintenance: 0, notices: 0 });
      } catch (err) { }
    };
    fetchCounts();
    const intervalId = setInterval(fetchCounts, 15000);
    return () => clearInterval(intervalId);
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={screenOpts}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <NotificationContext.Provider value={{ ...badgeCounts, clearBadge }}>
      {user.role === 'owner' ? <OwnerTabs /> : <TenantTabs />}
    </NotificationContext.Provider>
  );
}

// ─── App Root ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopColor: colors.outlineVariant,
    borderTopWidth: 1,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  moreIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  moreLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.onSurface },
  badgeCircle: {
    backgroundColor: colors.error,
    borderRadius: 99,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    paddingHorizontal: 5
  },
  badgeText: { ...typography.labelMd, fontSize: 11, color: colors.onError },
});
