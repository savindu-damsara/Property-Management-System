import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, RefreshControl,
    KeyboardAvoidingView, Platform, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { maintenanceAPI, authAPI, BASE_URL } from '../../services/api';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import { colors, typography, spacing } from '../../constants/theme';

const PRIORITY_COLORS = {
    low: { bg: '#e8f5e9', text: '#2e7d32' },
    medium: { bg: '#fff3e0', text: '#e65100' },
    high: { bg: '#fbe9e7', text: '#bf360c' },
    urgent: { bg: colors.errorContainer, text: colors.onErrorContainer },
};

export default function MaintenanceOwnerScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');

    // Modals
    const [actionModal, setActionModal] = useState(null); // original approve/reject
    const [reason, setReason] = useState('');

    const [editReqModal, setEditReqModal] = useState(null); // reject edit request
    const [deleteReqModal, setDeleteReqModal] = useState(null); // reject delete request
    const [cancelOwnerModal, setCancelOwnerModal] = useState(null); // owner canceling approved issue

    const load = useCallback(async () => {
        try {
            const { data } = await maintenanceAPI.getAll();
            setRequests(data || []);
        } catch (err) { console.log(err?.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useFocusEffect(useCallback(() => {
        load();
        authAPI.clearNotification('maintenance').catch(() => { });
    }, [load]));

    useEffect(() => { load(); }, [load]);

    const handleApprove = async (id, action, newStatus) => {
        try {
            await maintenanceAPI.approve(id, { action, rejectionReason: reason.trim() || undefined, newStatus });
            setActionModal(null); setReason(''); load();
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Action failed'); }
    };

    const handleApproveEdit = async (id, action) => {
        try {
            await maintenanceAPI.approveEdit(id, { action, reason: reason.trim() || undefined });
            setEditReqModal(null); setReason(''); load();
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Action failed'); }
    };

    const handleApproveDelete = async (id, action) => {
        try {
            await maintenanceAPI.approveDelete(id, { action, reason: reason.trim() || undefined });
            setDeleteReqModal(null); setReason(''); load();
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Action failed'); }
    };

    const handleOwnerCancel = async (id) => {
        try {
            await maintenanceAPI.ownerCancel(id, { reason: reason.trim() || undefined });
            setCancelOwnerModal(null); setReason(''); load();
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Cancel failed'); }
    };

    const FILTERS = ['all', 'pending_approval', 'approved', 'in_progress', 'completed', 'rejected'];
    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

    const editReqCount = requests.filter(r => r.editRequest?.status === 'pending').length;
    const deleteReqCount = requests.filter(r => r.deleteRequest?.status === 'pending').length;

    const renderNormalCard = (item) => {
        const pc = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium;
        return (
            <Card key={item._id} style={styles.card}>
                <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.titleRow}>
                            <Text style={styles.reqTitle} numberOfLines={1}>{item.title}</Text>
                            <View style={[styles.priorityChip, { backgroundColor: pc.bg }]}>
                                <Text style={[styles.priorityText, { color: pc.text }]}>{item.priority.toUpperCase()}</Text>
                            </View>
                        </View>
                        <Text style={styles.tenantInfo}>{item.tenant?.name} • {item.property?.title}</Text>
                    </View>
                    <Badge status={item.status} />
                </View>
                <Text style={styles.description} numberOfLines={3}>{item.description}</Text>

                {item.images && item.images.length > 0 && (
                    <TouchableOpacity onPress={() => Linking.openURL(`${BASE_URL}${item.images[0]}`)} style={{ marginTop: spacing.xs }}>
                        <Text style={{ ...typography.labelMd, color: colors.primary }}>View Attached Photos ({item.images.length})</Text>
                    </TouchableOpacity>
                )}

                {item.status === 'pending_approval' && (
                    <View style={styles.btnRow}>
                        <Button title="Approve" size="sm" style={styles.half} onPress={() => handleApprove(item._id, 'approve', 'approved')} />
                        <Button title="Reject" variant="danger" size="sm" style={styles.half} onPress={() => { setActionModal(item); setReason(''); }} />
                    </View>
                )}
                {(item.status === 'approved' || item.status === 'in_progress') && (
                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                        {item.status === 'approved' && (
                            <Button title="Mark In Progress" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => handleApprove(item._id, 'approve', 'in_progress')} />
                        )}
                        {item.status === 'in_progress' && (
                            <Button title="Mark Completed" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => handleApprove(item._id, 'approve', 'completed')} />
                        )}
                        <Button title="Cancel Issue" size="sm" variant="danger" style={{ flex: 1 }} onPress={() => { setCancelOwnerModal(item); setReason(''); }} />
                    </View>
                )}
            </Card>
        );
    };

    const renderEditCard = (item) => (
        <Card key={`er-${item._id}`} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: '#e65100' }]}>
            <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.reqTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.tenantInfo}>{item.tenant?.name} • {item.property?.title}</Text>
                    <Text style={{ ...typography.labelMd, color: '#e65100', marginTop: 4 }}>Edit Requested →</Text>
                </View>
                <Badge status={item.status} />
            </View>
            <View style={styles.updateBox}>
                <Text style={styles.updateLabel}>Proposed changes:</Text>
                {item.editRequest?.title !== item.title && <Text style={styles.updateText}>Title: {item.editRequest.title}</Text>}
                {item.editRequest?.description !== item.description && <Text style={styles.updateText}>Desc: {item.editRequest.description}</Text>}
                {item.editRequest?.priority !== item.priority && <Text style={styles.updateText}>Priority: {item.editRequest.priority.toUpperCase()}</Text>}
                {item.editRequest?.images && item.editRequest.images.length > 0 && (
                    <Text style={styles.updateText}>Photos: {item.editRequest.images.length} new photos</Text>
                )}
            </View>
            <View style={styles.btnRow}>
                <Button title="Approve Edit" size="sm" style={styles.half} onPress={() => handleApproveEdit(item._id, 'approve')} />
                <Button title="Reject" variant="danger" size="sm" style={styles.half} onPress={() => { setEditReqModal(item); setReason(''); }} />
            </View>
        </Card>
    );

    const renderDeleteCard = (item) => (
        <Card key={`dr-${item._id}`} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: colors.error }]}>
            <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.reqTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.tenantInfo}>{item.tenant?.name} • {item.property?.title}</Text>
                    <Text style={{ ...typography.labelMd, color: colors.error, marginTop: 4 }}>Cancellation Requested</Text>
                </View>
                <Badge status={item.status} />
            </View>
            {item.deleteRequest?.reason && (
                <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4 }}>Reason: {item.deleteRequest.reason}</Text>
            )}
            <View style={styles.btnRow}>
                <Button title="Approve Cancel" variant="danger" size="sm" style={styles.half} onPress={() => handleApproveDelete(item._id, 'approve')} />
                <Button title="Reject" variant="outline" size="sm" style={styles.half} onPress={() => { setDeleteReqModal(item); setReason(''); }} />
            </View>
        </Card>
    );

    const normalBills = filtered.filter(b => b.editRequest?.status !== 'pending' && b.deleteRequest?.status !== 'pending');
    // For pending requests views
    const pendingEdits = filter === 'all' || filter === 'approved' || filter === 'in_progress' ? requests.filter(r => r.editRequest?.status === 'pending') : [];
    const pendingDeletes = filter === 'all' || filter === 'approved' || filter === 'in_progress' ? requests.filter(r => r.deleteRequest?.status === 'pending') : [];

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.sm }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Maintenance Requests</Text>
                    {(editReqCount + deleteReqCount) > 0 && (
                        <Text style={{ ...typography.bodySm, color: colors.error }}>
                            {editReqCount + deleteReqCount} request(s) need attention
                        </Text>
                    )}
                </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
                {FILTERS.map(f => (
                    <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
            >
                {pendingEdits.length > 0 && (
                    <View style={{ marginBottom: spacing.md }}>
                        <Text style={styles.sectionTitle}>✏️ Pending Edit Requests</Text>
                        {pendingEdits.map(renderEditCard)}
                    </View>
                )}

                {pendingDeletes.length > 0 && (
                    <View style={{ marginBottom: spacing.md }}>
                        <Text style={styles.sectionTitle}>✖️ Pending Cancellation Requests</Text>
                        {pendingDeletes.map(renderDeleteCard)}
                    </View>
                )}

                {(pendingEdits.length > 0 || pendingDeletes.length > 0) && normalBills.length > 0 && (
                    <Text style={styles.sectionTitle}>📄 Regular Requests</Text>
                )}

                {normalBills.map(renderNormalCard)}

                {filtered.length === 0 && !loading && (
                    <View style={styles.empty}>
                        <Ionicons name="build-outline" size={54} color={colors.outlineVariant} />
                        <Text style={styles.emptyText}>No maintenance requests</Text>
                    </View>
                )}
            </ScrollView>

            {/* Reject Modals */}
            {[
                { visible: !!actionModal, close: () => setActionModal(null), submit: () => handleApprove(actionModal._id, 'reject') },
                { visible: !!editReqModal, close: () => setEditReqModal(null), submit: () => handleApproveEdit(editReqModal._id, 'reject') },
                { visible: !!deleteReqModal, close: () => setDeleteReqModal(null), submit: () => handleApproveDelete(deleteReqModal._id, 'reject') },
                { visible: !!cancelOwnerModal, close: () => setCancelOwnerModal(null), submit: () => handleOwnerCancel(cancelOwnerModal._id), title: 'Cancellation Reason' }
            ].map((cfg, idx) => (
                <Modal key={idx} visible={cfg.visible} transparent animationType="slide">
                    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                        <View style={styles.modal}>
                            <Text style={styles.modalTitle}>{cfg.title || 'Rejection Reason'}</Text>
                            <TextInput style={styles.reasonInput} placeholder="Enter reason..." placeholderTextColor={colors.outline} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
                            <View style={styles.btnRow}>
                                <Button title="Cancel" variant="ghost" size="sm" style={styles.half} onPress={cfg.close} />
                                <Button title="Submit" variant="danger" size="sm" style={styles.half} onPress={() => { if (!reason.trim()) { Alert.alert('Error', 'Reason required'); return; } cfg.submit(); }} />
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            ))}
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
    filterBar: { paddingHorizontal: spacing.margin, paddingVertical: spacing.sm, flexGrow: 0, maxHeight: 50 },
    filterChip: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: colors.outlineVariant, marginRight: spacing.sm, alignSelf: 'center' },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    filterTextActive: { color: colors.onPrimary },
    scroll: { padding: spacing.margin, paddingBottom: 80 },
    sectionTitle: { ...typography.h3, fontSize: 16, color: colors.onSurface, marginBottom: spacing.sm },
    card: { marginBottom: spacing.sm, padding: spacing.md },
    cardTop: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
    reqTitle: { ...typography.h3, fontSize: 15, color: colors.onSurface, flex: 1 },
    priorityChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
    priorityText: { ...typography.labelMd, fontSize: 10 },
    tenantInfo: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
    description: { ...typography.bodyMd, color: colors.onSurface, marginBottom: spacing.sm },
    btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    half: { flex: 1 },
    updateBox: { backgroundColor: colors.surfaceContainerLow, borderRadius: 8, padding: spacing.sm, gap: spacing.xs, marginBottom: spacing.sm },
    updateLabel: { ...typography.labelMd, color: colors.onSurface },
    updateText: { ...typography.bodySm, color: colors.onSurfaceVariant },
    empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, gap: spacing.sm },
    modalTitle: { ...typography.h3, color: colors.onSurface },
    reasonInput: { borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 12, padding: spacing.md, ...typography.bodyMd, color: colors.onSurface, height: 90, textAlignVertical: 'top' },
});
