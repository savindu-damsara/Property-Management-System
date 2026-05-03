import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Modal, TextInput, Alert, RefreshControl, Linking,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { billsAPI, authAPI, BASE_URL } from '../../services/api';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import { colors, typography, spacing } from '../../constants/theme';

const formatLKR = (n) => `LKR ${Number(n || 0).toLocaleString()}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const ymToLabel = (ym) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    return `${MONTH_LABELS[parseInt(m, 10) - 1]} ${y}`;
};

export default function BillingOwnerScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [data, setData] = useState({ bills: [], stats: {} });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [rejectModal, setRejectModal] = useState(null);
    const [reason, setReason] = useState('');
    const [filter, setFilter] = useState('pending_approval');

    // Edit / Delete request action modals
    const [editReqModal, setEditReqModal] = useState(null); // { bill, action: 'approve'|'reject' }
    const [deleteReqModal, setDeleteReqModal] = useState(null);
    const [reqReason, setReqReason] = useState('');

    const load = useCallback(async () => {
        try {
            const res = await billsAPI.getAll();
            setData(res.data || { bills: [], stats: {} });
        } catch (err) { console.log(err?.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useFocusEffect(useCallback(() => {
        load();
        authAPI.clearNotification('bills').catch(() => { });
    }, [load]));

    useEffect(() => { load(); }, [load]);

    const handleApprove = async (id, action) => {
        try {
            await billsAPI.approve(id, { action, rejectionReason: reason.trim() || undefined });
            setRejectModal(null); setReason(''); load();
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Action failed'); }
    };

    const handleEditReq = async (bill, action) => {
        try {
            await billsAPI.approveEdit(bill._id, { action, rejectionReason: reqReason.trim() || undefined });
            setEditReqModal(null); setReqReason(''); load();
            Alert.alert('Done', `Edit request ${action === 'approve' ? 'approved' : 'rejected'}.`);
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed'); }
    };

    const handleDeleteReq = async (bill, action) => {
        try {
            await billsAPI.approveDelete(bill._id, { action, rejectionReason: reqReason.trim() || undefined });
            setDeleteReqModal(null); setReqReason(''); load();
            Alert.alert('Done', `Deletion request ${action === 'approve' ? 'approved' : 'rejected'}.`);
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed'); }
    };

    const bills = data.bills || [];
    const stats = data.stats || {};

    // Separate out bills by section
    const pendingBills = bills.filter(b => b.status === 'pending_approval');
    const editReqBills = bills.filter(b => b.editRequest?.status === 'pending');
    const deleteReqBills = bills.filter(b => b.deleteRequest?.status === 'pending');
    const filtered = filter === 'all' ? bills : bills.filter(b => b.status === filter);
    const FILTERS = ['pending_approval', 'approved', 'rejected', 'all'];

    const renderBillCard = (item, { showApprove = false } = {}) => (
        <Card key={item._id} style={styles.card}>
            <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.billTitle}>{item.title}</Text>
                    <Text style={styles.billSub}>
                        {item.tenant?.name} · {formatDate(item.paidDate)}
                        {item.rentMonth ? ` · ${ymToLabel(item.rentMonth)}` : ''}
                    </Text>
                    <Text style={styles.billProp} numberOfLines={1}>{item.property?.title}</Text>
                    <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant }}>
                        Type: {item.billType?.[0].toUpperCase()}{item.billType?.slice(1)}
                    </Text>
                    {item.document && (
                        <TouchableOpacity style={{ marginTop: 4 }} onPress={() => Linking.openURL(`${BASE_URL}${item.document}`)}>
                            <Text style={{ ...typography.labelMd, color: colors.primary }}>View Receipt</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.billAmount}>{formatLKR(item.amount)}</Text>
                    <Badge status={item.status} />
                </View>
            </View>
            {item.description ? <Text style={styles.billDesc} numberOfLines={2}>{item.description}</Text> : null}
            {item.status === 'rejected' && item.rejectionReason && (
                <View style={styles.rejBox}><Text style={styles.rejText}>Reason: {item.rejectionReason}</Text></View>
            )}
            {showApprove && item.status === 'pending_approval' && (
                <View style={styles.btnRow}>
                    <Button title="Approve" size="sm" style={styles.half} onPress={() => handleApprove(item._id, 'approve')} />
                    <Button title="Reject" variant="danger" size="sm" style={styles.half} onPress={() => { setRejectModal(item); setReason(''); }} />
                </View>
            )}
        </Card>
    );

    const renderEditReqCard = (item) => (
        <Card key={`er-${item._id}`} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: '#e65100' }]}>
            <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.billTitle}>{item.title}</Text>
                    <Text style={styles.billSub}>{item.tenant?.name} · {item.property?.title}</Text>
                    <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant }}>
                        Type: {item.billType?.[0].toUpperCase()}{item.billType?.slice(1)}
                        {item.rentMonth ? ` · ${ymToLabel(item.rentMonth)}` : ''}
                    </Text>
                    <Text style={{ ...typography.labelMd, color: '#e65100', marginTop: 4 }}>Edit Requested →</Text>
                </View>
                <Badge status={item.status} />
            </View>
            <View style={[styles.changeBox]}>
                <Text style={styles.changeLabel}>Proposed changes:</Text>
                {item.editRequest?.title !== item.title && <Text style={styles.changeRow}>Title: {item.editRequest?.title}</Text>}
                {item.editRequest?.amount !== item.amount && <Text style={styles.changeRow}>Amount: {formatLKR(item.editRequest?.amount)}</Text>}
                {item.editRequest?.paidDate && <Text style={styles.changeRow}>Date: {formatDate(item.editRequest.paidDate)}</Text>}
                {item.editRequest?.description !== item.description && <Text style={styles.changeRow}>Description: {item.editRequest?.description}</Text>}
                {item.editRequest?.document && item.editRequest.document !== item.document && (
                    <TouchableOpacity onPress={() => Linking.openURL(`${BASE_URL}${item.editRequest.document}`)}>
                        <Text style={{ ...typography.labelMd, color: colors.primary }}>View New Receipt</Text>
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.btnRow}>
                <Button title="Approve Edit" size="sm" style={styles.half} onPress={() => handleEditReq(item, 'approve')} />
                <Button title="Reject" variant="danger" size="sm" style={styles.half}
                    onPress={() => { setEditReqModal(item); setReqReason(''); }} />
            </View>
        </Card>
    );

    const renderDeleteReqCard = (item) => (
        <Card key={`dr-${item._id}`} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: colors.error }]}>
            <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.billTitle}>{item.title}</Text>
                    <Text style={styles.billSub}>{item.tenant?.name} · {item.property?.title}</Text>
                    <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant }}>
                        Type: {item.billType?.[0].toUpperCase()}{item.billType?.slice(1)}
                        {item.rentMonth ? ` · ${ymToLabel(item.rentMonth)}` : ''}
                    </Text>
                    <Text style={{ ...typography.labelMd, color: colors.error, marginTop: 4 }}>Deletion Requested</Text>
                </View>
                <Text style={styles.billAmount}>{formatLKR(item.amount)}</Text>
            </View>
            {item.deleteRequest?.reason ? (
                <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4 }}>Reason: {item.deleteRequest.reason}</Text>
            ) : null}
            <View style={styles.btnRow}>
                <Button title="Approve Delete" variant="danger" size="sm" style={styles.half} onPress={() => handleDeleteReq(item, 'approve')} />
                <Button title="Reject" variant="outline" size="sm" style={styles.half}
                    onPress={() => { setDeleteReqModal(item); setReqReason(''); }} />
            </View>
        </Card>
    );

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.sm }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Billing & Payments</Text>
                    {(editReqBills.length + deleteReqBills.length) > 0 && (
                        <Text style={{ ...typography.bodySm, color: colors.error }}>
                            {editReqBills.length + deleteReqBills.length} request(s) need attention
                        </Text>
                    )}
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
            >
                {/* Stats */}
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

                {/* Edit Requests Section */}
                {editReqBills.length > 0 && (
                    <>
                        <Text style={styles.sectionLabel}>✏️ Pending Edit Requests</Text>
                        {editReqBills.map(renderEditReqCard)}
                    </>
                )}

                {/* Delete Requests Section */}
                {deleteReqBills.length > 0 && (
                    <>
                        <Text style={styles.sectionLabel}>🗑️ Pending Deletion Requests</Text>
                        {deleteReqBills.map(renderDeleteReqCard)}
                    </>
                )}

                {/* Regular bill filter + list */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                    <View style={styles.filterRow}>
                        {FILTERS.map(f => (
                            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
                                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                    {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                {filtered.map(item => renderBillCard(item, { showApprove: item.status === 'pending_approval' }))}
                {filtered.length === 0 && !loading && (
                    <View style={styles.empty}>
                        <Ionicons name="card-outline" size={54} color={colors.outlineVariant} />
                        <Text style={styles.emptyText}>No payments</Text>
                    </View>
                )}
            </ScrollView>

            {/* Reject Payment Modal */}
            <Modal visible={!!rejectModal} transparent animationType="slide" onRequestClose={() => setRejectModal(null)}>
                <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Reject Payment</Text>
                        <TextInput style={styles.reasonInput} placeholder="Reason for rejection..." placeholderTextColor={colors.outline}
                            value={reason} onChangeText={setReason} multiline numberOfLines={3} />
                        <View style={styles.btnRow}>
                            <Button title="Cancel" variant="ghost" size="sm" style={styles.half} onPress={() => setRejectModal(null)} />
                            <Button title="Reject" variant="danger" size="sm" style={styles.half}
                                onPress={() => { if (!reason.trim()) { Alert.alert('Info', 'Please enter a reason'); return; } handleApprove(rejectModal._id, 'reject'); }} />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Reject Edit Request Modal */}
            <Modal visible={!!editReqModal} transparent animationType="slide" onRequestClose={() => setEditReqModal(null)}>
                <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Reject Edit Request</Text>
                        <TextInput style={styles.reasonInput} placeholder="Reason for rejection..." placeholderTextColor={colors.outline}
                            value={reqReason} onChangeText={setReqReason} multiline numberOfLines={3} />
                        <View style={styles.btnRow}>
                            <Button title="Cancel" variant="ghost" size="sm" style={styles.half} onPress={() => setEditReqModal(null)} />
                            <Button title="Reject" variant="danger" size="sm" style={styles.half}
                                onPress={() => { if (!reqReason.trim()) { Alert.alert('Reason required'); return; } handleEditReq(editReqModal, 'reject'); }} />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Reject Delete Request Modal */}
            <Modal visible={!!deleteReqModal} transparent animationType="slide" onRequestClose={() => setDeleteReqModal(null)}>
                <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Reject Deletion Request</Text>
                        <TextInput style={styles.reasonInput} placeholder="Reason for rejection..." placeholderTextColor={colors.outline}
                            value={reqReason} onChangeText={setReqReason} multiline numberOfLines={3} />
                        <View style={styles.btnRow}>
                            <Button title="Cancel" variant="ghost" size="sm" style={styles.half} onPress={() => setDeleteReqModal(null)} />
                            <Button title="Reject" variant="danger" size="sm" style={styles.half}
                                onPress={() => { if (!reqReason.trim()) { Alert.alert('Reason required'); return; } handleDeleteReq(deleteReqModal, 'reject'); }} />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', padding: spacing.margin, backgroundColor: colors.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
    headerTitle: { ...typography.h3, color: colors.onSurface },
    scroll: { padding: spacing.margin, paddingBottom: 80 },
    statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    statCard: { flex: 1, borderRadius: 16, padding: spacing.md, gap: 4 },
    statLabel: { ...typography.bodySm },
    statVal: { ...typography.h3, fontSize: 18 },
    sectionLabel: { ...typography.labelMd, color: colors.onSurfaceVariant, letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
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
    changeBox: { backgroundColor: colors.surfaceContainerLow, borderRadius: 8, padding: spacing.sm, marginTop: spacing.xs, gap: 2 },
    changeLabel: { ...typography.labelMd, color: colors.onSurfaceVariant },
    changeRow: { ...typography.bodySm, color: colors.onSurface },
    btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    half: { flex: 1 },
    empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, gap: spacing.sm },
    modalTitle: { ...typography.h3, color: colors.onSurface },
    reasonInput: { borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 12, padding: spacing.md, ...typography.bodyMd, color: colors.onSurface, height: 90, textAlignVertical: 'top' },
});
