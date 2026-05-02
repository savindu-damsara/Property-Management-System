import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, TextInput,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { leasesAPI } from '../../services/api';
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
    const [updateModal, setUpdateModal] = useState(null);
    const [doc, setDoc] = useState(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try { const { data } = await leasesAPI.getAll(); setLeases(data || []); }
        catch (err) { console.log(err?.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const pickDoc = async () => {
        const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
        if (!r.canceled && r.assets?.[0]) setDoc(r.assets[0]);
    };

    const handleUpdate = async (id) => {
        setSaving(true);
        try {
            const fd = new FormData();
            const u = updateModal;
            if (u.startDate) fd.append('startDate', u.startDate);
            if (u.endDate) fd.append('endDate', u.endDate);
            if (u.rentAmount) fd.append('rentAmount', u.rentAmount);
            if (u.terms) fd.append('terms', u.terms);
            if (doc) fd.append('document', { uri: doc.uri, type: doc.mimeType, name: doc.name });
            await leasesAPI.update(id, fd);
            setUpdateModal(null); setDoc(null); load();
            Alert.alert('Sent', 'Lease update request sent to property owner.');
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const handleTerminate = (id) => {
        Alert.alert('Terminate Lease', 'Request lease termination? Owner must approve.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Request', style: 'destructive', onPress: async () => { try { await leasesAPI.delete(id); load(); Alert.alert('Sent', 'Termination request sent.'); } catch (err) { Alert.alert('Error', 'Failed'); } } },
        ]);
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
                            <View style={{ flex: 1 }}>
                                <Text style={styles.propTitle} numberOfLines={1}>{item.property?.title || 'Property'}</Text>
                                <Text style={styles.ownerName}>Owner: {item.owner?.name}</Text>
                            </View>
                            <Badge status={item.status} />
                        </View>
                        <View style={styles.leaseInfo}>
                            <View style={styles.infoRow}><Text style={styles.infoLabel}>Period</Text><Text style={styles.infoVal}>{formatDate(item.startDate)} – {formatDate(item.endDate)}</Text></View>
                            <View style={styles.infoRow}><Text style={styles.infoLabel}>Rent</Text><Text style={styles.infoVal}>{formatLKR(item.rentAmount)}/mo</Text></View>
                            {item.terms && <View style={styles.infoRow}><Text style={styles.infoLabel}>Terms</Text><Text style={styles.infoVal} numberOfLines={2}>{item.terms}</Text></View>}
                        </View>
                        {item.status === 'rejected' && item.rejectionReason && (
                            <View style={styles.rejBox}><Text style={styles.rejText}>Reason: {item.rejectionReason}</Text></View>
                        )}
                        {item.status === 'active' && (
                            <View style={styles.btnRow}>
                                <Button title="Request Update" variant="outline" size="sm" style={styles.half} onPress={() => { setUpdateModal({ id: item._id, startDate: '', endDate: '', rentAmount: '', terms: '' }); setDoc(null); }} />
                                <Button title="Terminate" variant="danger" size="sm" style={styles.half} onPress={() => handleTerminate(item._id)} />
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
                <Button
                    title="Find Properties to Lease"
                    onPress={() => navigation.navigate('Explorer')}
                    style={{ marginTop: spacing.md }}
                    icon={<Ionicons name="search" size={18} color={colors.onPrimary} />}
                />
            </ScrollView>

            {/* Update Modal */}
            <Modal visible={!!updateModal} transparent animationType="slide" onRequestClose={() => setUpdateModal(null)}>
                <View style={styles.overlay}>
                    <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
                        <Text style={styles.modalTitle}>Request Lease Update</Text>
                        <Input label="New Start Date" placeholder="2025-07-01" value={updateModal?.startDate || ''} onChangeText={v => setUpdateModal(p => ({ ...p, startDate: v }))} />
                        <Input label="New End Date" placeholder="2026-06-30" value={updateModal?.endDate || ''} onChangeText={v => setUpdateModal(p => ({ ...p, endDate: v }))} />
                        <Input label="New Rent Amount" placeholder="55000" value={updateModal?.rentAmount || ''} onChangeText={v => setUpdateModal(p => ({ ...p, rentAmount: v }))} keyboardType="numeric" />
                        <Input label="Updated Terms" placeholder="Updated terms..." value={updateModal?.terms || ''} onChangeText={v => setUpdateModal(p => ({ ...p, terms: v }))} multiline numberOfLines={3} />
                        <TouchableOpacity style={styles.attachBtn} onPress={pickDoc}><Ionicons name="attach" size={18} color={colors.primary} /><Text style={styles.attachText}>{doc ? doc.name : 'Attach Document'}</Text></TouchableOpacity>
                        <View style={styles.btnRow}>
                            <Button title="Cancel" variant="ghost" style={styles.half} onPress={() => setUpdateModal(null)} />
                            <Button title="Send Request" style={styles.half} loading={saving} onPress={() => handleUpdate(updateModal.id)} />
                        </View>
                    </ScrollView>
                </View>
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
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, maxHeight: '90%' },
    modalTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.md },
    attachBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.outlineVariant, borderStyle: 'dashed', borderRadius: 10, padding: spacing.sm, marginBottom: spacing.sm },
    attachText: { ...typography.bodyMd, color: colors.primary, flex: 1 },
});
