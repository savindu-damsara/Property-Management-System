import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl,
    TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { propertiesAPI, appointmentsAPI, leasesAPI, maintenanceAPI, billsAPI } from '../../services/api';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, typography, spacing, shadows } from '../../constants/theme';

const formatLKR = (n) => `LKR ${Number(n || 0).toLocaleString()}`;

export default function OwnerDashboard() {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [stats, setStats] = useState({ properties: 0, leases: 0, pendingAppts: 0, pendingMaint: 0, monthlyIncome: 0 });
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const [propsRes, apptsRes, leasesRes, maintRes, billsRes] = await Promise.all([
                propertiesAPI.getMine(),
                appointmentsAPI.getAll(),
                leasesAPI.getAll(),
                maintenanceAPI.getAll(),
                billsAPI.getAll(),
            ]);
            const props = propsRes.data || [];
            const appts = apptsRes.data || [];
            const leases = leasesRes.data || [];
            const maint = maintRes.data || [];
            const { stats: billStats } = billsRes.data || {};

            setStats({
                properties: props.length,
                leases: leases.filter(l => l.status === 'active').length,
                pendingAppts: appts.filter(a => a.status === 'pending').length,
                pendingMaint: maint.filter(m => m.status === 'pending_approval').length,
                monthlyIncome: leases.filter(l => l.status === 'active').reduce((s, l) => s + (l.rentAmount || 0), 0),
            });
            setAppointments(appts.slice(0, 5));
        } catch (err) {
            console.log('Dashboard load error:', err?.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    const onRefresh = () => { setRefreshing(true); load(); };

    const statCards = [
        { label: 'Total Properties', value: stats.properties, icon: 'home', bg: colors.secondaryContainer, fg: colors.onSecondaryContainer },
        { label: 'Active Leases', value: stats.leases, icon: 'document-text', bg: colors.secondaryContainer, fg: colors.onSecondaryContainer },
        { label: 'Monthly Income', value: formatLKR(stats.monthlyIncome), icon: 'cash', bg: colors.primary, fg: colors.onPrimary, wide: true },
        { label: 'Pending Maintenance', value: stats.pendingMaint, icon: 'build', bg: colors.errorContainer, fg: colors.onErrorContainer, wide: true },
    ];

    if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>;

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceContainerLowest} />
            {/* Top App Bar */}
            <View style={styles.appBar}>
                <View style={styles.appBarLeft}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{(user?.name || 'O')[0].toUpperCase()}</Text>
                    </View>
                    <View>
                        <Text style={styles.greetSub}>Good day,</Text>
                        <Text style={styles.greetName} numberOfLines={1}>{user?.name?.split(' ')[0]}</Text>
                    </View>
                </View>
                {stats.pendingAppts > 0 && (
                    <View style={styles.notifBadge}>
                        <Ionicons name="notifications" size={22} color={colors.primary} />
                        <View style={styles.notifDot}><Text style={styles.notifCount}>{stats.pendingAppts}</Text></View>
                    </View>
                )}
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
            >
                <Text style={styles.sectionTitle}>Overview</Text>

                {/* Stats Bento */}
                <View style={styles.bentoGrid}>
                    {statCards.map((s, i) => (
                        <View key={i} style={[styles.statCard, s.wide && styles.statWide, { backgroundColor: s.bg }]}>
                            <View style={[styles.statIcon, { backgroundColor: s.fg + '22' }]}>
                                <Ionicons name={s.icon} size={20} color={s.fg} />
                            </View>
                            <Text style={[styles.statLabel, { color: s.fg + 'cc' }]}>{s.label}</Text>
                            <Text style={[styles.statValue, { color: s.fg }]}>{s.value}</Text>
                        </View>
                    ))}
                </View>

                {/* Recent Appointments */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Appointments</Text>
                    <Text style={styles.pendingChip}>{stats.pendingAppts} pending</Text>
                </View>

                {appointments.length === 0 ? (
                    <Card style={styles.emptyCard}>
                        <Ionicons name="calendar-outline" size={36} color={colors.outlineVariant} />
                        <Text style={styles.emptyText}>No appointments yet</Text>
                    </Card>
                ) : appointments.map((appt) => (
                    <Card key={appt._id} style={styles.apptCard}>
                        <View style={styles.apptRow}>
                            <View style={styles.apptAvatar}>
                                <Text style={styles.apptAvatarText}>
                                    {(appt.tenant?.name || 'T')[0].toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.apptName}>{appt.tenant?.name}</Text>
                                <Text style={styles.apptSub}>{new Date(appt.date).toLocaleDateString()} • {appt.time}</Text>
                                <Text style={styles.apptProp} numberOfLines={1}>{appt.property?.title}</Text>
                            </View>
                            <Badge status={appt.status} />
                        </View>
                        {appt.location && (
                            <View style={styles.apptLoc}>
                                <Ionicons name="location-outline" size={14} color={colors.onSurfaceVariant} />
                                <Text style={styles.apptLocText} numberOfLines={1}>{appt.location}</Text>
                            </View>
                        )}
                    </Card>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    appBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: spacing.margin, backgroundColor: colors.surfaceContainerLowest,
        borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
    },
    appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    avatar: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { ...typography.h3, color: colors.onPrimary, fontSize: 16 },
    greetSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
    greetName: { ...typography.h3, color: colors.onSurface },
    notifBadge: { position: 'relative' },
    notifDot: {
        position: 'absolute', top: -4, right: -4,
        backgroundColor: colors.error, borderRadius: 9, minWidth: 18, height: 18,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
    },
    notifCount: { ...typography.labelMd, color: '#fff', fontSize: 10 },
    scroll: { padding: spacing.margin, paddingBottom: 100 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm, marginTop: spacing.md },
    sectionTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.sm, marginTop: spacing.md },
    pendingChip: {
        ...typography.labelMd, color: colors.onSecondaryContainer,
        backgroundColor: colors.secondaryContainer, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
    },
    bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    statCard: { width: '47%', borderRadius: 16, padding: spacing.md, ...shadows.card },
    statWide: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    statLabel: { ...typography.bodySm, marginBottom: 4 },
    statValue: { ...typography.h2 },
    emptyCard: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    apptCard: { marginBottom: spacing.sm, padding: spacing.md },
    apptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    apptAvatar: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryContainer,
        alignItems: 'center', justifyContent: 'center',
    },
    apptAvatarText: { ...typography.h3, fontSize: 16, color: colors.onPrimary },
    apptName: { ...typography.h3, fontSize: 15, color: colors.onSurface },
    apptSub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
    apptProp: { ...typography.bodySm, color: colors.primary, marginTop: 2 },
    apptLoc: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.outlineVariant },
    apptLocText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
});
