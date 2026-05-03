import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, TextInput, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appointmentsAPI } from '../../services/api';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import { colors, typography, spacing } from '../../constants/theme';

export default function AppointmentsOwnerScreen() {
    const insets = useSafeAreaInsets();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [rejectModal, setRejectModal] = useState(null); // appointment being rejected
    const [reason, setReason] = useState('');
    const [filter, setFilter] = useState('all');

    const load = useCallback(async () => {
        try {
            const { data } = await appointmentsAPI.getAll();
            setAppointments(data || []);
        } catch (err) {
            console.log(err?.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAction = async (id, status, rejectionReason) => {
        try {
            await appointmentsAPI.updateStatus(id, { status, rejectionReason });
            setAppointments(prev => prev.map(a => a._id === id ? { ...a, status } : a));
            setRejectModal(null);
            setReason('');
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Action failed');
        }
    };

    const handleChangeRequest = async (id, status) => {
        try {
            await appointmentsAPI.approveChangeRequest(id, { status });
            load();
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Action failed');
        }
    };

    const FILTERS = ['all', 'pending', 'accepted', 'rejected', 'change_requested'];
    const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);

    const renderItem = ({ item }) => (
        <Card style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>{(item.tenant?.name || 'T')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.tenant?.name}</Text>
                    <Text style={styles.phone}>{item.tenant?.phone}</Text>
                </View>
                <Badge status={item.status} />
            </View>

            <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                    <Ionicons name="home-outline" size={14} color={colors.primary} />
                    <Text style={styles.infoText} numberOfLines={1}>{item.property?.title}</Text>
                </View>
                <View style={styles.infoItem}>
                    <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                    <Text style={styles.infoText}>{new Date(item.date).toLocaleDateString()} • {item.time}</Text>
                </View>
                <View style={styles.infoItem}>
                    <Ionicons name="location-outline" size={14} color={colors.primary} />
                    <Text style={styles.infoText} numberOfLines={1}>{item.location}</Text>
                </View>
            </View>

            {item.status === 'rejected' && item.rejectionReason && (
                <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>Rejection reason:</Text>
                    <Text style={styles.reasonText}>{item.rejectionReason}</Text>
                </View>
            )}

            {item.status === 'change_requested' && item.changeRequest && (
                <View style={styles.changeBox}>
                    <Text style={styles.reasonLabel}>Tenant requested change:</Text>
                    <Text style={styles.reasonText}>
                        {new Date(item.changeRequest.date).toLocaleDateString()} • {item.changeRequest.time} • {item.changeRequest.location}
                    </Text>
                    <View style={styles.btnRow}>
                        <Button title="Accept Change" onPress={() => handleChangeRequest(item._id, 'accepted')} size="sm" style={styles.half} />
                        <Button title="Reject Change" onPress={() => handleChangeRequest(item._id, 'rejected')} variant="outline" size="sm" style={styles.half} />
                    </View>
                </View>
            )}

            {item.status === 'pending' && (
                <View style={styles.btnRow}>
                    <Button title="Accept" onPress={() => handleAction(item._id, 'accepted')} size="sm" style={styles.half} />
                    <Button title="Reject" onPress={() => { setRejectModal(item); setReason(''); }} variant="danger" size="sm" style={styles.half} />
                </View>
            )}
        </Card>
    );

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Appointments</Text>
                <Text style={styles.headerSub}>{appointments.filter(a => a.status === 'pending').length} pending</Text>
            </View>

            {/* Filter chips */}
            <View>
                <FlatList
                    data={FILTERS}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={item => item}
                    contentContainerStyle={styles.filterBar}
                    renderItem={({ item: f }) => (
                        <TouchableOpacity style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
                            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
                ListEmptyComponent={() => !loading && (
                    <View style={styles.empty}>
                        <Ionicons name="calendar-outline" size={54} color={colors.outlineVariant} />
                        <Text style={styles.emptyText}>No appointments found</Text>
                    </View>
                )}
            />

            {/* Rejection Modal */}
            <Modal visible={!!rejectModal} transparent animationType="slide" onRequestClose={() => setRejectModal(null)}>
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Rejection Reason</Text>
                        <Text style={styles.modalSub}>Please provide a reason for rejecting this appointment</Text>
                        <TextInput
                            style={styles.reasonInput}
                            placeholder="Enter reason..."
                            placeholderTextColor={colors.outline}
                            value={reason}
                            onChangeText={setReason}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.modalBtns}>
                            <Button title="Cancel" variant="ghost" onPress={() => setRejectModal(null)} style={styles.half} />
                            <Button
                                title="Reject"
                                variant="danger"
                                onPress={() => {
                                    if (!reason.trim()) { Alert.alert('Info', 'Please enter a reason'); return; }
                                    handleAction(rejectModal._id, 'rejected', reason.trim());
                                }}
                                style={styles.half}
                            />
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
        padding: spacing.margin, backgroundColor: colors.surfaceContainerLowest,
        borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
    },
    headerTitle: { ...typography.h2, color: colors.onSurface },
    headerSub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
    filterBar: { paddingHorizontal: spacing.margin, paddingVertical: spacing.sm, gap: spacing.sm },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99,
        borderWidth: 1.5, borderColor: colors.outlineVariant,
    },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    filterTextActive: { color: colors.onPrimary },
    list: { padding: spacing.margin, paddingBottom: 100 },
    card: { marginBottom: spacing.sm, padding: spacing.md },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
    avatarText: { ...typography.h3, fontSize: 18, color: colors.onPrimary },
    name: { ...typography.h3, fontSize: 15, color: colors.onSurface },
    phone: { ...typography.bodySm, color: colors.onSurfaceVariant },
    infoGrid: { gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: spacing.sm },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoText: { ...typography.bodySm, color: colors.onSurface, flex: 1 },
    reasonBox: { backgroundColor: colors.errorContainer, borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm },
    changeBox: { backgroundColor: colors.surfaceContainerLow, borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm, gap: spacing.xs },
    reasonLabel: { ...typography.labelMd, color: colors.onSurface },
    reasonText: { ...typography.bodySm, color: colors.onSurface },
    btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    half: { flex: 1 },
    empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, gap: spacing.sm },
    modalTitle: { ...typography.h3, color: colors.onSurface },
    modalSub: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    reasonInput: {
        borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 12,
        padding: spacing.md, ...typography.bodyMd, color: colors.onSurface, height: 100, textAlignVertical: 'top',
    },
    modalBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
