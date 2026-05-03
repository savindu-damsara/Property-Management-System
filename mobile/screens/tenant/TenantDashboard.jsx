import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { appointmentsAPI, leasesAPI, maintenanceAPI, billsAPI, BASE_URL } from '../../services/api';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, typography, spacing, shadows } from '../../constants/theme';

const formatLKR = (n) => `LKR ${Number(n || 0).toLocaleString()}`;

export default function TenantDashboard({ navigation }) {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [stats, setStats] = useState({ activeLease: null, pendingAppts: 0, pendingMaint: 0, remainingRent: 0 });
    const [recentAppts, setRecentAppts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const leasesRes = await leasesAPI.getAll();
            const leases = leasesRes.data || [];
            const activeLease = leases.find(l => l.status === 'active');

            const propId = activeLease?.property?._id || activeLease?.property;

            const [apptsRes, maintRes, billsRes] = await Promise.all([
                appointmentsAPI.getAll(),
                maintenanceAPI.getAll(),
                propId ? billsAPI.getAll({ property: propId }) : Promise.resolve({ data: { stats: { remainingRent: 0 } } })
            ]);

            const appts = apptsRes.data || [];
            const maint = maintRes.data || [];
            const { stats: bs } = billsRes.data || {};

            setStats({
                activeLease,
                pendingAppts: appts.filter(a => a.status === 'pending').length,
                pendingMaint: maint.filter(m => ['pending_approval', 'approved', 'in_progress'].includes(m.status)).length,
                remainingRent: bs?.remainingRent || 0,
            });
            setRecentAppts(appts.slice(0, 3));
        } catch (err) { console.log(err?.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.appBar}>
                <TouchableOpacity style={styles.appBarLeft} onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
                    {user?.avatar ? (
                        <Image key={user.avatar} source={{ uri: `${BASE_URL}${user.avatar}` }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{(user?.name || 'T')[0].toUpperCase()}</Text>
                        </View>
                    )}
                    <View>
                        <Text style={styles.greetSub}>Hello,</Text>
                        <Text style={styles.greetName}>{user?.name?.split(' ')[0]}</Text>
                    </View>
                </TouchableOpacity>
                <View style={styles.tenantBadge}>
                    <Text style={styles.tenantBadgeText}>TENANT</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
            >
                {/* Active Lease Banner */}
                {stats.activeLease ? (
                    <TouchableOpacity style={styles.leaseBanner} onPress={() => navigation.navigate('PropertyDetail', { id: stats.activeLease.property?._id })}>
                        <View style={styles.leaseBannerIcon}>
                            <Ionicons name="document-text" size={20} color={colors.onPrimary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.leaseBannerLabel}>Active Lease</Text>
                            <Text style={styles.leaseBannerProp} numberOfLines={1}>{stats.activeLease.property?.title}</Text>
                            <Text style={styles.leaseBannerRent}>{formatLKR(stats.activeLease.rentAmount)}/month</Text>
                        </View>
                        <Badge status="active" />
                    </TouchableOpacity>
                ) : (
                    <View style={[styles.leaseBanner, { backgroundColor: colors.surfaceContainerLow }]}>
                        <Ionicons name="home-outline" size={24} color={colors.onSurfaceVariant} />
                        <Text style={[styles.leaseBannerLabel, { color: colors.onSurfaceVariant, marginLeft: 12 }]}>No active lease – browse properties to find your home</Text>
                    </View>
                )}

                <Text style={styles.sectionTitle}>Quick Overview</Text>
                <View style={styles.quickGrid}>
                    {[
                        { label: 'Pending Appts', value: stats.pendingAppts, icon: 'calendar', bg: colors.secondaryContainer, fg: colors.onSecondaryContainer },
                        { label: 'Active Requests', value: stats.pendingMaint, icon: 'build', bg: colors.tertiaryContainer, fg: colors.onTertiaryContainer },
                        { label: 'Rent Due', value: formatLKR(stats.remainingRent), icon: 'cash', bg: stats.remainingRent > 0 ? colors.errorContainer : colors.secondaryContainer, fg: stats.remainingRent > 0 ? colors.onErrorContainer : colors.onSecondaryContainer, wide: true },
                    ].map((s, i) => (
                        <View key={i} style={[styles.quickCard, s.wide && styles.quickWide, { backgroundColor: s.bg }]}>
                            <Ionicons name={s.icon} size={20} color={s.fg} />
                            <Text style={[styles.quickLabel, { color: s.fg + 'cc' }]}>{s.label}</Text>
                            <Text style={[styles.quickValue, { color: s.fg }]}>{s.value}</Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Recent Appointments</Text>
                {recentAppts.length === 0 ? (
                    <Card style={styles.emptyCard}>
                        <Ionicons name="calendar-outline" size={36} color={colors.outlineVariant} />
                        <Text style={styles.emptyText}>No appointments yet</Text>
                    </Card>
                ) : recentAppts.map(appt => (
                    <Card key={appt._id} style={styles.apptCard}>
                        <View style={styles.apptRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.apptProp} numberOfLines={1}>{appt.property?.title}</Text>
                                <Text style={styles.apptMeta}>{new Date(appt.date).toLocaleDateString()} • {appt.time}</Text>
                            </View>
                            <Badge status={appt.status} />
                        </View>
                        {appt.status === 'rejected' && appt.rejectionReason && (
                            <Text style={styles.rejText}>Reason: {appt.rejectionReason}</Text>
                        )}
                    </Card>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    appBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: spacing.margin, backgroundColor: colors.surfaceContainerLowest,
        borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
    },
    appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { ...typography.h3, fontSize: 16, color: colors.onSecondary },
    greetSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
    greetName: { ...typography.h3, color: colors.onSurface },
    tenantBadge: { backgroundColor: colors.secondaryContainer, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
    tenantBadgeText: { ...typography.labelMd, color: colors.onSecondaryContainer },
    scroll: { padding: spacing.margin, paddingBottom: 100 },
    leaseBanner: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        backgroundColor: colors.primary, borderRadius: 16, padding: spacing.md,
        marginBottom: spacing.lg, ...shadows.card,
    },
    leaseBannerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    leaseBannerLabel: { ...typography.labelMd, color: colors.onPrimary + 'cc' },
    leaseBannerProp: { ...typography.h3, fontSize: 15, color: colors.onPrimary },
    leaseBannerRent: { ...typography.bodySm, color: colors.primaryFixed },
    sectionTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.sm, marginTop: spacing.md },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    quickCard: { width: '47%', borderRadius: 14, padding: spacing.md, gap: 4, ...shadows.card },
    quickWide: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    quickLabel: { ...typography.bodySm },
    quickValue: { ...typography.h3 },
    emptyCard: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    apptCard: { marginBottom: spacing.sm, padding: spacing.md },
    apptRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    apptProp: { ...typography.h3, fontSize: 14, color: colors.onSurface },
    apptMeta: { ...typography.bodySm, color: colors.onSurfaceVariant },
    rejText: { ...typography.bodySm, color: colors.error, marginTop: spacing.xs },
});
