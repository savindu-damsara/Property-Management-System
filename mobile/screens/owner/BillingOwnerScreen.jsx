import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, FlatList,
    TouchableOpacity, Modal, TextInput, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { billsAPI } from '../../services/api';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import { colors, typography, spacing } from '../../constants/theme';

const formatLKR = (n) => `LKR ${Number(n || 0).toLocaleString()}`;

export default function BillingOwnerScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [data, setData] = useState({ bills: [], stats: {} });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [rejectModal, setRejectModal] = useState(null);
    const [reason, setReason] = useState('');
    const [filter, setFilter] = useState('pending_approval');

    const load = useCallback(async () => {
        try {
            const res = await billsAPI.getAll();
            setData(res.data || { bills: [], stats: {} });
        } catch (err) { console.log(err?.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleApprove = async (id, action) => {
        try {
            await billsAPI.approve(id, { action, rejectionReason: reason.trim() || undefined });
            setRejectModal(null); setReason(''); load();
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Action failed'); }
    };

    const bills = data.bills || [];
    const stats = data.stats || {};
    const filtered = filter === 'all' ? bills : bills.filter(b => b.status === filter);

    const FILTERS = ['pending_approval', 'approved', 'rejected', 'all'];

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.sm }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Billing & Payments</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
            >
                {/* Stats Cards */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
                        <Ionicons name="cash" size={20} color={colors.onPrimary} />
                        <Text style={[styles.statLabel, { color: colors.onPrimary + 'cc' }]}>Total Collected</Text>
                        <Text style={[styles.statVal, { color: colors.onPrimary }]}>{formatLKR(stats.totalPaid)}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.secondaryContainer }]}>
                        <Ionicons name="hourglass" size={20} color={colors.onSecondaryContainer} />
                        <Text style={[styles.statLabel, { color: colors.onSecondaryContainer + 'cc' }]}>Pending</Text>
                        <Text style={[styles.statVal, { color: colors.onSecondaryContainer }]}>{formatLKR(stats.totalPending)}</Text>
                    </View>
                </View>

                {/* Filter chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                    <View style={styles.filterRow}>
                        {FILTERS.map(f => (
                            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
                                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                    {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                {filtered.map(item => (
                    <Card key={item._id} style={styles.card}>
                        <View style={styles.cardTop}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.billTitle}>{item.title}</Text>
                                <Text style={styles.billSub}>{item.tenant?.name} • {new Date(item.paidDate).toLocaleDateString()}</Text>
                                <Text style={styles.billProp} numberOfLines={1}>{item.property?.title}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                <Text style={styles.billAmount}>{formatLKR(item.amount)}</Text>
                                <Badge status={item.status} />
                            </View>
                        </View>
                        {item.description && <Text style={styles.billDesc} numberOfLines={2}>{item.description}</Text>}
                        {item.status === 'rejected' && item.rejectionReason && (
                            <View style={styles.rejBox}><Text style={styles.rejText}>Reason: {item.rejectionReason}</Text></View>
                        )}
                        {item.status === 'pending_approval' && (
                            <View style={styles.btnRow}>
                                <Button title="Approve" size="sm" style={styles.half} onPress={() => handleApprove(item._id, 'approve')} />
                                <Button title="Reject" variant="danger" size="sm" style={styles.half} onPress={() => { setRejectModal(item); setReason(''); }} />
                            </View>
                        )}
                    </Card>
                ))}
                {filtered.length === 0 && !loading && (
                    <View style={styles.empty}>
                        <Ionicons name="card-outline" size={54} color={colors.outlineVariant} />
                        <Text style={styles.emptyText}>No {filter} payments</Text>
                    </View>
                )}
            </ScrollView>

            <Modal visible={!!rejectModal} transparent animationType="slide" onRequestClose={() => setRejectModal(null)}>
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Reject Payment</Text>
                        <TextInput style={styles.reasonInput} placeholder="Reason for rejection..." placeholderTextColor={colors.outline} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
                        <View style={styles.btnRow}>
                            <Button title="Cancel" variant="ghost" size="sm" style={styles.half} onPress={() => setRejectModal(null)} />
                            <Button title="Reject" variant="danger" size="sm" style={styles.half} onPress={() => { if (!reason.trim()) { Alert.alert('Info', 'Please enter a reason'); return; } handleApprove(rejectModal._id, 'reject'); }} />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', padding: spacing.margin,
        backgroundColor: colors.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
    },
    headerTitle: { ...typography.h3, color: colors.onSurface },
    scroll: { padding: spacing.margin, paddingBottom: 80 },
    statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    statCard: { flex: 1, borderRadius: 16, padding: spacing.md, gap: 4 },
    statLabel: { ...typography.bodySm },
    statVal: { ...typography.h3, fontSize: 18 },
    filterRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm },
    filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: colors.outlineVariant },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    filterTextActive: { color: colors.onPrimary },
    card: { marginBottom: spacing.sm, padding: spacing.md },
    cardTop: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
    billTitle: { ...typography.h3, fontSize: 15, color: colors.onSurface },
    billSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
    billProp: { ...typography.bodySm, color: colors.primary },
    billAmount: { ...typography.h3, color: colors.primary },
    billDesc: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: spacing.xs },
    rejBox: { backgroundColor: colors.errorContainer, borderRadius: 8, padding: spacing.sm, marginTop: spacing.xs },
    rejText: { ...typography.bodySm, color: colors.onErrorContainer },
    btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    half: { flex: 1 },
    empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, gap: spacing.sm },
    modalTitle: { ...typography.h3, color: colors.onSurface },
    reasonInput: { borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 12, padding: spacing.md, ...typography.bodyMd, color: colors.onSurface, height: 90, textAlignVertical: 'top' },
});
