import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, TextInput, Linking, KeyboardAvoidingView, Platform
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { leasesAPI, authAPI, BASE_URL } from '../../services/api';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors, typography, spacing } from '../../constants/theme';

const formatLKR = (n) => `LKR ${Number(n || 0).toLocaleString()}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';

export default function LeasesTenantScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [leases, setLeases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [terminateModal, setTerminateModal] = useState(null);
    const [termReason, setTermReason] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try { const { data } = await leasesAPI.getAll(); setLeases(data || []); }
        catch (err) { console.log(err?.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useFocusEffect(useCallback(() => {
        load();
        authAPI.clearNotification('leases').catch(() => { });
    }, [load]));

    useEffect(() => { load(); }, [load]);

    const hasActiveLease = leases.some(l => l.status === 'active');

    const handleTerminate = async () => {
        if (!termReason.trim()) { Alert.alert('Error', 'Termination reason is required'); return; }
        setSaving(true);
        try {
            await leasesAPI.requestTermination(terminateModal._id, { reason: termReason.trim() });
            setTerminateModal(null); setTermReason(''); load();
            Alert.alert('Sent', 'Termination request sent to the owner for approval.');
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const handleCancelDirectly = (item) => {
        Alert.alert(
            'Cancel Lease Request',
            'Are you sure you want to cancel this pending lease request? This cannot be undone.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await leasesAPI.delete(item._id);
                            load();
                            Alert.alert('Cancelled', 'Your lease request has been cancelled.');
                        } catch (err) {
                            Alert.alert('Error', err?.response?.data?.message || 'Failed to cancel');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.sm }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Lease Contracts</Text>
            </View>
            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
            >
                {leases.map(item => (
                    <Card key={item._id} style={styles.card}>
                        <View style={styles.cardTop}>
                            <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('PropertyDetail', { id: item.property?._id })}>
                                <Text style={styles.propTitle} numberOfLines={1}>{item.property?.title || 'Property'}</Text>
                                <Text style={styles.ownerName}>Owner: {item.owner?.name}</Text>
                            </TouchableOpacity>
                            <Badge status={item.status} />
                        </View>
                        <View style={styles.leaseInfo}>
                            <View style={styles.infoRow}><Text style={styles.infoLabel}>Period</Text><Text style={styles.infoVal}>{formatDate(item.startDate)} – {formatDate(item.endDate)}</Text></View>
                            <View style={styles.infoRow}><Text style={styles.infoLabel}>Rent</Text><Text style={styles.infoVal}>{formatLKR(item.rentAmount)}/mo</Text></View>
                            {item.terms && <View style={styles.infoRow}><Text style={styles.infoLabel}>Terms</Text><Text style={styles.infoVal} numberOfLines={2}>{item.terms}</Text></View>}
                        </View>
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
                        {item.status === 'rejected' && item.rejectionReason && (
                            <View style={styles.rejBox}><Text style={styles.rejText}>Reason: {item.rejectionReason}</Text></View>
                        )}
                        {/* Update rejection: lease is still active but update was rejected */}
                        {item.status === 'active' && item.rejectionReason && (
                            <View style={[styles.rejBox, { backgroundColor: '#fff3e0' }]}>
                                <Text style={[styles.rejText, { color: '#e65100' }]}>
                                    ⚠️ Update request rejected: {item.rejectionReason}
                                </Text>
                            </View>
                        )}
                        {item.status === 'cancelled' && (
                            <View style={[styles.rejBox, { backgroundColor: colors.surfaceContainerHighest }]}>
                                <Text style={[styles.rejText, { color: colors.onSurface }]}>
                                    {item.tenantCancellationReason || 'This lease request was cancelled.'}
                                </Text>
                            </View>
                        )}
                        {item.status === 'terminated' && (
                            <View style={[styles.rejBox, { backgroundColor: colors.outlineVariant + '40' }]}><Text style={[styles.rejText, { color: colors.onSurface }]}>Terminated{item.terminationReason ? `: ${item.terminationReason}` : ''}</Text></View>
                        )}
                        {/* PENDING: direct edit or cancel without any approval needed */}
                        {item.status === 'pending_approval' && (
                            <View style={styles.btnRow}>
                                <Button
                                    title="Edit"
                                    variant="outline"
                                    size="sm"
                                    style={styles.half}
                                    icon={<Ionicons name="create-outline" size={14} color={colors.primary} />}
                                    onPress={() => navigation.push('RequestLease', {
                                        editLease: {
                                            _id: item._id,
                                            startDate: item.startDate,
                                            endDate: item.endDate,
                                            rentAmount: item.rentAmount,
                                            rentDueDay: item.rentDueDay || 1,
                                            terms: item.terms || '',
                                            documents: item.documents || [],
                                            property: { title: item.property?.title || '' },
                                        }
                                    })}
                                />
                                <Button
                                    title="Cancel Request"
                                    variant="danger"
                                    size="sm"
                                    style={styles.half}
                                    onPress={() => handleCancelDirectly(item)}
                                />
                            </View>
                        )}
                        {/* ACTIVE: Request Update navigates to full form; Termination opens modal */}
                        {item.status === 'active' && (
                            <View style={styles.btnRow}>
                                <Button
                                    title="Request Update"
                                    variant="outline"
                                    size="sm"
                                    style={styles.half}
                                    onPress={() => navigation.push('RequestLease', {
                                        isUpdateRequest: true,
                                        editLease: {
                                            _id: item._id,
                                            startDate: item.startDate,
                                            endDate: item.endDate,
                                            rentAmount: item.rentAmount,
                                            rentDueDay: item.rentDueDay || 1,
                                            terms: item.terms || '',
                                            documents: item.documents || [],
                                            property: { title: item.property?.title || '' },
                                        },
                                    })}
                                />
                                <Button title="Request Termination" variant="danger" size="sm" style={styles.half}
                                    onPress={() => { setTerminateModal(item); setTermReason(''); }} />
                            </View>
                        )}
                    </Card>
                ))}
                {leases.length === 0 && !loading && (
                    <View style={styles.empty}>
                        <Ionicons name="document-text-outline" size={54} color={colors.outlineVariant} />
                        <Text style={styles.emptyText}>No lease contracts yet</Text>
                    </View>
                )}
                {hasActiveLease ? (
                    <View style={styles.activeBanner}>
                        <Ionicons name="lock-closed" size={16} color={colors.primary} />
                        <Text style={styles.activeBannerText}>
                            You have an active lease. Terminate it first to request a new one.
                        </Text>
                    </View>
                ) : (
                    <Button
                        title="Find Properties to Lease"
                        onPress={() => navigation.navigate('Explorer')}
                        style={{ marginTop: spacing.md }}
                        icon={<Ionicons name="search" size={18} color={colors.onPrimary} />}
                    />
                )}
            </ScrollView>

            {/* Update Modal */}

            {/* Terminate Modal */}
            <Modal visible={!!terminateModal} transparent animationType="slide" onRequestClose={() => setTerminateModal(null)}>
                <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Request Termination</Text>
                        <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.sm }}>Provide a reason to request termination. This requires owner approval.</Text>
                        <TextInput
                            style={{ borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 12, padding: spacing.md, ...typography.bodyMd, color: colors.onSurface, height: 100, textAlignVertical: 'top' }}
                            placeholder="Enter reason..."
                            placeholderTextColor={colors.outline}
                            value={termReason}
                            onChangeText={setTermReason}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.btnRow}>
                            <Button title="Go Back" variant="ghost" style={styles.half} onPress={() => setTerminateModal(null)} />
                            <Button title="Submit Request" variant="danger" style={styles.half} loading={saving} onPress={handleTerminate} />
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
    card: { marginBottom: spacing.sm, padding: spacing.md },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
    propTitle: { ...typography.h3, fontSize: 15, color: colors.onSurface },
    ownerName: { ...typography.bodySm, color: colors.onSurfaceVariant },
    leaseInfo: { gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: spacing.sm },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
    infoLabel: { ...typography.bodySm, color: colors.onSurfaceVariant, width: 60 },
    infoVal: { ...typography.bodySm, color: colors.onSurface, flex: 1, textAlign: 'right' },
    rejBox: { backgroundColor: colors.errorContainer, borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm },
    rejText: { ...typography.bodySm, color: colors.onErrorContainer },
    btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    half: { flex: 1 },
    empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    activeBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryFixed + '22', borderRadius: 12, padding: spacing.md, marginTop: spacing.md },
    activeBannerText: { ...typography.bodySm, color: colors.primary, flex: 1 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, maxHeight: '90%' },
    modalTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.md },
    attachBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.outlineVariant, borderStyle: 'dashed', borderRadius: 10, padding: spacing.sm, marginBottom: spacing.sm },
    attachText: { ...typography.bodyMd, color: colors.primary, flex: 1 },
});
