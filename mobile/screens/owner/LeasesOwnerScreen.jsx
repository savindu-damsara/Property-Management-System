import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, Alert, RefreshControl, TextInput, ScrollView, Linking,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { leasesAPI, authAPI, BASE_URL } from '../../services/api';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import { colors, typography, spacing } from '../../constants/theme';

const formatLKR = (n) => `LKR ${Number(n || 0).toLocaleString()}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';

export default function LeasesOwnerScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [leases, setLeases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionModal, setActionModal] = useState(null);
    const [reason, setReason] = useState('');
    const [terminateModal, setTerminateModal] = useState(null);
    const [termReason, setTermReason] = useState('');

    const load = useCallback(async () => {
        try {
            const { data } = await leasesAPI.getAll();
            setLeases(data || []);
        } catch (err) { console.log(err?.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useFocusEffect(useCallback(() => {
        load();
        authAPI.clearNotification('leases').catch(() => { });
    }, [load]));

    useEffect(() => { load(); }, [load]);

    const handleApprove = async (id, action) => {
        try {
            await leasesAPI.approve(id, { action, rejectionReason: reason.trim() || undefined });
            setActionModal(null); setReason(''); load();
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Action failed'); }
    };

    const handleTerminate = async () => {
        if (!termReason.trim()) { Alert.alert('Error', 'Reason is required'); return; }
        try {
            await leasesAPI.ownerTerminate(terminateModal._id, { reason: termReason.trim() });
            setTerminateModal(null); setTermReason(''); load();
            Alert.alert('Success', 'Lease formally terminated');
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed'); }
    };

    const pendingLeases = leases.filter(l => ['pending_approval', 'pending_update', 'pending_termination'].includes(l.status));
    const otherLeases = leases.filter(l => !['pending_approval', 'pending_update', 'pending_termination'].includes(l.status));

    const renderLease = (item) => {
        const isPending = ['pending_approval', 'pending_update', 'pending_termination'].includes(item.status);
        const pu = item.pendingUpdate; // proposed changes for pending_update

        // Build diff: only fields that actually changed
        const diffs = [];
        if (pu) {
            const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
            const startChanged = pu.startDate && fmtDate(pu.startDate) !== fmtDate(item.startDate);
            const endChanged = pu.endDate && fmtDate(pu.endDate) !== fmtDate(item.endDate);
            if (startChanged || endChanged) diffs.push({
                label: 'Period',
                from: `${fmtDate(item.startDate)} – ${fmtDate(item.endDate)}`,
                to: `${fmtDate(pu.startDate)} – ${fmtDate(pu.endDate)}`,
            });
            if (pu.rentAmount && Number(pu.rentAmount) !== Number(item.rentAmount)) diffs.push({
                label: 'Rent',
                from: `${formatLKR(item.rentAmount)}/mo`,
                to: `${formatLKR(pu.rentAmount)}/mo`,
            });
            if (pu.rentDueDay && Number(pu.rentDueDay) !== Number(item.rentDueDay)) diffs.push({
                label: 'Due Day',
                from: `${item.rentDueDay || 1}th of month`,
                to: `${pu.rentDueDay}th of month`,
            });
            if (pu.terms && pu.terms !== item.terms) diffs.push({
                label: 'Terms',
                from: item.terms || '(none)',
                to: pu.terms,
            });
        }

        return (
            <Card key={item._id} style={styles.card}>
                <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.propTitle} numberOfLines={1}>{item.property?.title || 'Property'}</Text>
                        <Text style={styles.tenantName}>{item.tenant?.name}</Text>
                        <Text style={styles.tenantContact}>{item.tenant?.phone}</Text>
                    </View>
                    <Badge status={item.status} />
                </View>
                <View style={styles.leaseInfo}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Period</Text>
                        <Text style={styles.infoVal}>{formatDate(item.startDate)} – {formatDate(item.endDate)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Rent</Text>
                        <Text style={styles.infoVal}>{formatLKR(item.rentAmount)}/mo</Text>
                    </View>
                    {item.rentDueDay && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Due Day</Text>
                            <Text style={styles.infoVal}>{item.rentDueDay}th of each month</Text>
                        </View>
                    )}
                    {item.terms && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Terms</Text>
                            <Text style={styles.infoVal} numberOfLines={2}>{item.terms}</Text>
                        </View>
                    )}
                    {item.documents && item.documents.length > 0 && (
                        <View style={{ marginTop: spacing.sm, gap: 4 }}>
                            <Text style={styles.infoLabel}>Attachments:</Text>
                            {item.documents.map((docUrl, idx) => (
                                <TouchableOpacity key={idx} onPress={() => Linking.openURL(`${BASE_URL}${docUrl}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Ionicons name="document-text" size={16} color={colors.primary} />
                                    <Text style={{ ...typography.bodySm, color: colors.primary }}>View Attachment {idx + 1}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Proposed changes diff — only for pending_update */}
                {item.status === 'pending_update' && (
                    <View style={styles.diffBox}>
                        <View style={styles.diffHeader}>
                            <Ionicons name="git-compare-outline" size={15} color="#0277bd" />
                            <Text style={styles.diffTitle}>
                                {diffs.length > 0 ? `${diffs.length} change${diffs.length > 1 ? 's' : ''} requested` : 'Update request (no detectable field changes)'}
                            </Text>
                        </View>
                        {diffs.map((d, i) => (
                            <View key={i} style={styles.diffRow}>
                                <Text style={styles.diffLabel}>{d.label}</Text>
                                <View style={{ flex: 1, gap: 2 }}>
                                    <Text style={styles.diffFrom} numberOfLines={2}>Was: {d.from}</Text>
                                    <Text style={styles.diffTo} numberOfLines={2}>→ {d.to}</Text>
                                </View>
                            </View>
                        ))}
                        {pu?.documents && pu.documents.length > 0 && (
                            <View style={styles.diffRow}>
                                <Text style={styles.diffLabel}>Docs</Text>
                                <View style={{ flex: 1, gap: 4 }}>
                                    {pu.documents.map((docUrl, idx) => (
                                        <TouchableOpacity key={idx} onPress={() => Linking.openURL(`${BASE_URL}${docUrl}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Ionicons name="document-text" size={14} color={colors.primary} />
                                            <Text style={{ ...typography.bodySm, color: colors.primary }}>New Attachment {idx + 1}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Termination request details */}
                {item.status === 'pending_termination' && item.terminationReason && (
                    <View style={[styles.diffBox, { backgroundColor: colors.errorContainer + '55', borderColor: colors.error + '44' }]}>
                        <View style={styles.diffHeader}>
                            <Ionicons name="warning-outline" size={15} color={colors.error} />
                            <Text style={[styles.diffTitle, { color: colors.error }]}>Termination Requested</Text>
                        </View>
                        <Text style={{ ...typography.bodySm, color: colors.onErrorContainer }}>Reason: {item.terminationReason}</Text>
                    </View>
                )}

                {item.status === 'terminated' && (
                    <View style={[styles.reasonBox, { backgroundColor: colors.errorContainer, borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm }]}>
                        <Text style={[styles.reasonLabel, { ...typography.bodySm, color: colors.onErrorContainer }]}>Terminated{item.terminationReason ? `: ${item.terminationReason}` : ''}</Text>
                    </View>
                )}
                {item.status === 'rejected' && item.rejectionReason && (
                    <View style={[styles.reasonBox, { backgroundColor: colors.errorContainer, borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm }]}>
                        <Text style={[styles.reasonLabel, { ...typography.bodySm, color: colors.onErrorContainer }]}>Reason: {item.rejectionReason}</Text>
                    </View>
                )}
                {item.status === 'cancelled' && (
                    <View style={[styles.reasonBox, { backgroundColor: colors.surfaceContainerHighest, borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm }]}>
                        <Text style={[styles.reasonLabel, { ...typography.bodySm, color: colors.onSurface }]}>
                            Cancelled — Tenant reason: {item.cancellationReason || 'Change of mind'}
                        </Text>
                    </View>
                )}
                {item.status === 'active' && (
                    <View style={styles.btnRow}>
                        <Button title="Terminate Lease" variant="danger" size="sm" style={styles.half} onPress={() => { setTerminateModal(item); setTermReason(''); }} />
                    </View>
                )}
                {isPending && (
                    <View style={styles.btnRow}>
                        <Button title="Approve" size="sm" style={styles.half} onPress={() => handleApprove(item._id, 'approve')} />
                        <Button
                            title={item.status === 'pending_update' ? 'Reject Update' : 'Reject'}
                            variant="danger" size="sm" style={styles.half}
                            onPress={() => { setActionModal(item); setReason(''); }}
                        />
                    </View>
                )}
            </Card>
        );
    };

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.sm }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Lease Contracts</Text>
                    <Text style={styles.headerSub}>{pendingLeases.length} pending approval</Text>
                </View>
            </View>
            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
            >
                {pendingLeases.length > 0 && (
                    <>
                        <Text style={styles.sectionLabel}>⏳ Awaiting Approval</Text>
                        {pendingLeases.map(renderLease)}
                    </>
                )}
                {otherLeases.length > 0 && (
                    <>
                        <Text style={styles.sectionLabel}>All Leases</Text>
                        {otherLeases.map(renderLease)}
                    </>
                )}
                {leases.length === 0 && !loading && (
                    <View style={styles.empty}>
                        <Ionicons name="document-text-outline" size={54} color={colors.outlineVariant} />
                        <Text style={styles.emptyText}>No lease contracts yet</Text>
                    </View>
                )}
            </ScrollView>
            <Modal visible={!!actionModal} transparent animationType="slide" onRequestClose={() => setActionModal(null)}>
                <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>
                            {actionModal?.status === 'pending_update' ? 'Reject Update Request' : 'Reject Lease Request'}
                        </Text>
                        <Text style={styles.modalSub}>
                            {actionModal?.status === 'pending_update'
                                ? 'Provide a reason. The lease will remain active — only the update is rejected.'
                                : 'Provide a reason for the tenant'}
                        </Text>
                        <TextInput style={styles.reasonInput} placeholder="Reason for rejection..." placeholderTextColor={colors.outline} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
                        <View style={styles.btnRow}>
                            <Button title="Cancel" variant="ghost" size="sm" style={styles.half} onPress={() => setActionModal(null)} />
                            <Button title="Confirm Reject" variant="danger" size="sm" style={styles.half} onPress={() => { if (!reason.trim()) { Alert.alert('Info', 'Please enter a reason'); return; } handleApprove(actionModal._id, 'reject'); }} />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Terminate Modal */}
            <Modal visible={!!terminateModal} transparent animationType="slide" onRequestClose={() => setTerminateModal(null)}>
                <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Terminate Active Lease</Text>
                        <Text style={styles.modalSub}>Provide a reason for terminating this active agreement to notify the tenant natively.</Text>
                        <TextInput
                            style={styles.reasonInput}
                            placeholder="Enter reason..."
                            placeholderTextColor={colors.outline}
                            value={termReason}
                            onChangeText={setTermReason}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.btnRow}>
                            <Button title="Go Back" variant="ghost" style={styles.half} onPress={() => setTerminateModal(null)} />
                            <Button title="Confirm Terminate" variant="danger" style={styles.half} onPress={handleTerminate} />
                        </View>
                    </View>
                </KeyboardAvoidingView>
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
    headerSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
    scroll: { padding: spacing.margin, paddingBottom: 80 },
    sectionLabel: { ...typography.labelMd, color: colors.onSurfaceVariant, letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md },
    card: { marginBottom: spacing.sm, padding: spacing.md },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm, gap: spacing.sm },
    propTitle: { ...typography.h3, fontSize: 15, color: colors.onSurface },
    tenantName: { ...typography.bodyMd, color: colors.onSurface },
    tenantContact: { ...typography.bodySm, color: colors.onSurfaceVariant },
    leaseInfo: { borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: spacing.sm, gap: spacing.xs },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    infoLabel: { ...typography.bodySm, color: colors.onSurfaceVariant, width: 60 },
    infoVal: { ...typography.bodySm, color: colors.onSurface, flex: 1, textAlign: 'right' },
    btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    half: { flex: 1 },
    empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, gap: spacing.sm },
    modalTitle: { ...typography.h3, color: colors.onSurface },
    modalSub: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    reasonInput: { borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 12, padding: spacing.md, ...typography.bodyMd, color: colors.onSurface, height: 90, textAlignVertical: 'top' },
    reasonBox: {},
    reasonLabel: {},
    // Diff styles
    diffBox: { marginTop: spacing.sm, borderWidth: 1, borderColor: '#b3e5fc', borderRadius: 10, backgroundColor: '#e3f2fd', padding: spacing.sm, gap: spacing.xs },
    diffHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    diffTitle: { ...typography.labelMd, color: '#0277bd' },
    diffRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#b3e5fc' },
    diffLabel: { ...typography.labelMd, color: '#0277bd', width: 54 },
    diffFrom: { ...typography.bodySm, color: colors.onSurfaceVariant },
    diffTo: { ...typography.bodySm, color: colors.primary, fontWeight: '700' },
});
