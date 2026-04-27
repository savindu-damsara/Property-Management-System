import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from './context/AuthContext';
import { colors, spacing } from './constants/theme';

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
      <Tab.Screen name="Appointments" component={AppointmentsOwnerScreen} />
      <Tab.Screen name="More" component={OwnerMoreStack} />
    </Tab.Navigator>
  );
}

function OwnerDashboardStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen name="OwnerDashboard" component={OwnerDashboard} />
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
      <Stack.Screen name="Leases" component={LeasesTenantScreen} />
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
    </Stack.Navigator>
  );
}

function TenantTabs() {
  const insets = useSafeAreaInsets();
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
      <Tab.Screen name="Appointments" component={AppointmentsTenantStack} />
      <Tab.Screen name="Notices" component={NoticeBoardScreen} />
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
  const items = [
    { label: 'Leases & Contracts', icon: 'document-text', screen: 'Leases' },
    { label: 'Billing & Payments', icon: 'card', screen: 'Billing' },
    { label: 'Maintenance', icon: 'build', screen: 'Maintenance' },
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

import { TouchableOpacity, Text, ScrollView } from 'react-native';
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

  return user.role === 'owner' ? <OwnerTabs /> : <TenantTabs />;
}

// ─── App Root ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
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
});
