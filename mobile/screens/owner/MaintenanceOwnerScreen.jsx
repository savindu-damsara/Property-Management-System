import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { maintenanceAPI } from '../../services/api';
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
    const [actionModal, setActionModal] = useState(null);
    const [reason, setReason] = useState('');
    const [progressModal, setProgressModal] = useState(null);
    const [filter, setFilter] = useState('pending_approval');

    const load = useCallback(async () => {
        try {
            const { data } = await maintenanceAPI.getAll();
            setRequests(data || []);
        } catch (err) { console.log(err?.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleApprove = async (id, action, newStatus) => {
        try {
            await maintenanceAPI.approve(id, { action, rejectionReason: reason.trim() || undefined, newStatus });
            setActionModal(null); setProgressModal(null); setReason(''); load();
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Action failed'); }
    };

    const FILTERS = ['pending_approval', 'approved', 'in_progress', 'completed', 'rejected', 'all'];
    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.sm }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Maintenance Requests</Text>
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
                {filtered.map(item => {
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
                            {item.status === 'pending_approval' && (
                                <View style={styles.btnRow}>
                                    <Button title="Approve" size="sm" style={styles.half} onPress={() => handleApprove(item._id, 'approve', 'approved')} />
                                    <Button title="Reject" variant="danger" size="sm" style={styles.half} onPress={() => { setActionModal(item); setReason(''); }} />
                                </View>
                            )}
                            {item.status === 'approved' && (
                                <Button title="Mark In Progress" size="sm" variant="secondary" onPress={() => handleApprove(item._id, 'approve', 'in_progress')} />
                            )}
                            {item.status === 'in_progress' && (
                                <Button title="Mark Completed" size="sm" variant="secondary" onPress={() => handleApprove(item._id, 'approve', 'completed')} />
                            )}
                            {item.status === 'pending_update' && item.pendingUpdate && (
                                <View style={styles.updateBox}>
                                    <Text style={styles.updateLabel}>Update requested:</Text>
                                    <Text style={styles.updateText}>{item.pendingUpdate.title} – {item.pendingUpdate.description}</Text>
                                    <View style={styles.btnRow}>
                                        <Button title="Accept" size="sm" style={styles.half} onPress={() => handleApprove(item._id, 'approve')} />
                                        <Button title="Reject" variant="danger" size="sm" style={styles.half} onPress={() => { setActionModal(item); setReason(''); }} />
                                    </View>
                                </View>
                            )}
                            {item.status === 'pending_deletion' && (
                                <View style={styles.btnRow}>
                                    <Button title="Approve Deletion" size="sm" variant="danger" style={styles.half} onPress={() => handleApprove(item._id, 'approve')} />
                                    <Button title="Reject" variant="outline" size="sm" style={styles.half} onPress={() => handleApprove(item._id, 'reject')} />
                                </View>
                            )}
                        </Card>
                    );
                })}
                {filtered.length === 0 && !loading && (
                    <View style={styles.empty}>
                        <Ionicons name="build-outline" size={54} color={colors.outlineVariant} />
                        <Text style={styles.emptyText}>No maintenance requests</Text>
                    </View>
                )}
            </ScrollView>

            <Modal visible={!!actionModal} transparent animationType="slide">
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Rejection Reason</Text>
                        <TextInput style={styles.reasonInput} placeholder="Enter reason..." placeholderTextColor={colors.outline} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
                        <View style={styles.btnRow}>
                            <Button title="Cancel" variant="ghost" size="sm" style={styles.half} onPress={() => setActionModal(null)} />
                            <Button title="Submit" variant="danger" size="sm" style={styles.half} onPress={() => { if (!reason.trim()) return; handleApprove(actionModal._id, 'reject'); }} />
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
    filterBar: { paddingHorizontal: spacing.margin, paddingVertical: spacing.sm, flexGrow: 0 },
    filterChip: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: colors.outlineVariant, marginRight: spacing.sm },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    filterTextActive: { color: colors.onPrimary },
    scroll: { padding: spacing.margin, paddingBottom: 80 },
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
    updateBox: { backgroundColor: colors.surfaceContainerLow, borderRadius: 8, padding: spacing.sm, gap: spacing.xs },
    updateLabel: { ...typography.labelMd, color: colors.onSurface },
    updateText: { ...typography.bodySm, color: colors.onSurface },
    empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, gap: spacing.sm },
    modalTitle: { ...typography.h3, color: colors.onSurface },
    reasonInput: { borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 12, padding: spacing.md, ...typography.bodyMd, color: colors.onSurface, height: 90, textAlignVertical: 'top' },
});
