import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { billsAPI, leasesAPI } from '../../services/api';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors, typography, spacing } from '../../constants/theme';

const formatLKR = (n) => `LKR ${Number(n || 0).toLocaleString()}`;

export default function BillingTenantScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [data, setData] = useState({ bills: [], stats: {} });
    const [activeProperties, setActiveProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [createModal, setCreateModal] = useState(false);
    const [form, setForm] = useState({ property: '', title: '', description: '', amount: '', paidDate: '', billType: 'rent' });
    const [doc, setDoc] = useState(null);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState('all');

    const load = useCallback(async () => {
        try {
            const [billsRes, leasesRes] = await Promise.all([billsAPI.getAll(), leasesAPI.getAll()]);
            setData(billsRes.data || { bills: [], stats: {} });

            const activePropMap = {};
            (leasesRes.data || []).forEach(l => {
                if (l.status === 'active' && l.property) activePropMap[l.property._id] = l.property;
            });
            const props = Object.values(activePropMap);
            setActiveProperties(props);
            if (props.length > 0) setForm(p => ({ ...p, property: props[0]._id }));
        }
        catch (err) { console.log(err?.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const pickDoc = async () => {
        const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
        if (!r.canceled && r.assets?.[0]) setDoc(r.assets[0]);
    };

    const handleCreate = async () => {
        if (!form.property) { Alert.alert('Info', 'Please select a property first. You need an active lease.'); return; }
        if (!form.title || !form.amount || !form.paidDate) { Alert.alert('Info', 'Title, amount and date required'); return; }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('property', form.property);
            fd.append('title', form.title);
            fd.append('description', form.description);
            fd.append('amount', form.amount);
            fd.append('paidDate', form.paidDate);
            fd.append('billType', form.billType);
            if (doc) fd.append('document', { uri: doc.uri, type: doc.mimeType, name: doc.name });
            await billsAPI.create(fd);
            setCreateModal(false); setDoc(null); load();
            Alert.alert('Submitted', 'Payment submitted for owner approval.');
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const bills = data.bills || [];
    const stats = data.stats || {};
    const filtered = filter === 'all' ? bills : bills.filter(b => b.status === filter);
    const FILTERS = ['all', 'pending_approval', 'approved', 'rejected'];
    const BILL_TYPES = ['rent', 'utility', 'maintenance', 'other'];

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.sm }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Billing</Text>
            </View>
            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
            >
                {/* Stats */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
                        <Text style={[styles.sLabel, { color: colors.onPrimary + 'cc' }]}>Total Paid</Text>
                        <Text style={[styles.sVal, { color: colors.onPrimary }]}>{formatLKR(stats.totalPaid)}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: stats.remainingRent > 0 ? colors.errorContainer : colors.secondaryContainer }]}>
                        <Ionicons name="alert-circle" size={20} color={stats.remainingRent > 0 ? colors.onErrorContainer : colors.onSecondaryContainer} />
                        <Text style={[styles.sLabel, { color: colors.onSurface + 'cc' }]}>Remaining</Text>
                        <Text style={[styles.sVal, { color: stats.remainingRent > 0 ? colors.error : colors.onSecondaryContainer }]}>{formatLKR(stats.remainingRent)}</Text>
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                    <View style={{ flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm }}>
                        {FILTERS.map(f => (
                            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
                                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                    {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
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
                                <Text style={styles.billMeta}>{item.billType} • {new Date(item.paidDate).toLocaleDateString()}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                <Text style={styles.billAmt}>{formatLKR(item.amount)}</Text>
                                <Badge status={item.status} />
                            </View>
                        </View>
                        {item.description && <Text style={styles.billDesc}>{item.description}</Text>}
                        {item.status === 'rejected' && item.rejectionReason && (
                            <View style={styles.rejBox}><Text style={styles.rejText}>Reason: {item.rejectionReason}</Text></View>
                        )}
                    </Card>
                ))}
                {filtered.length === 0 && !loading && (
                    <View style={styles.empty}><Ionicons name="card-outline" size={54} color={colors.outlineVariant} /><Text style={styles.emptyText}>No payments found</Text></View>
                )}

                <Button title="Submit Payment" onPress={() => { setCreateModal(true); setForm({ title: '', description: '', amount: '', paidDate: '', billType: 'rent' }); setDoc(null); }} style={{ marginTop: spacing.md }} icon={<Ionicons name="add" size={18} color={colors.onPrimary} />} />
            </ScrollView>

            <Modal visible={createModal} transparent animationType="slide" onRequestClose={() => setCreateModal(false)}>
                <View style={styles.overlay}>
                    <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
                        <Text style={styles.modalTitle}>Submit Payment</Text>

                        <Text style={styles.subLabel}>Property</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                            <View style={styles.typeRow}>
                                {activeProperties.length === 0 && <Text style={{ ...typography.bodySm, color: colors.error }}>No active leases to bill.</Text>}
                                {activeProperties.map(p => (
                                    <TouchableOpacity key={p._id} style={[styles.typeChip, form.property === p._id && styles.typeChipActive]} onPress={() => setForm(prev => ({ ...prev, property: p._id }))}>
                                        <Text style={[styles.typeText, form.property === p._id && { color: colors.primary }]}>{p.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <Input label="Title" placeholder="e.g. July 2025 Rent" value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v }))} />
                        <Input label="Amount (LKR)" placeholder="50000" value={form.amount} onChangeText={v => setForm(p => ({ ...p, amount: v }))} keyboardType="numeric" />
                        <Input label="Paid Date (YYYY-MM-DD)" placeholder="2025-07-01" value={form.paidDate} onChangeText={v => setForm(p => ({ ...p, paidDate: v }))} />
                        <Input label="Description (optional)" placeholder="Additional notes..." value={form.description} onChangeText={v => setForm(p => ({ ...p, description: v }))} multiline numberOfLines={2} />
                        <Text style={styles.subLabel}>Bill Type</Text>
                        <View style={styles.typeRow}>
                            {BILL_TYPES.map(t => (
                                <TouchableOpacity key={t} style={[styles.typeChip, form.billType === t && styles.typeChipActive]} onPress={() => setForm(p => ({ ...p, billType: t }))}>
                                    <Text style={[styles.typeText, form.billType === t && { color: colors.primary }]}>{t[0].toUpperCase() + t.slice(1)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.attachBtn} onPress={pickDoc}><Ionicons name="attach" size={18} color={colors.primary} /><Text style={styles.attachText}>{doc ? doc.name : 'Upload Receipt / Bill'}</Text></TouchableOpacity>
                        <View style={styles.btnRow}>
                            <Button title="Cancel" variant="ghost" style={styles.half} onPress={() => setCreateModal(false)} />
                            <Button title="Submit" style={styles.half} loading={saving} onPress={handleCreate} />
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
    statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    statCard: { flex: 1, borderRadius: 16, padding: spacing.md, gap: 4 },
    sLabel: { ...typography.bodySm },
    sVal: { ...typography.h3, fontSize: 16 },
    filterChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: colors.outlineVariant },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    filterTextActive: { color: colors.onPrimary },
    card: { marginBottom: spacing.sm, padding: spacing.md },
    cardTop: { flexDirection: 'row', gap: spacing.sm },
    billTitle: { ...typography.h3, fontSize: 15, color: colors.onSurface },
    billMeta: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
    billAmt: { ...typography.h3, color: colors.primary },
    billDesc: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: spacing.xs },
    rejBox: { backgroundColor: colors.errorContainer, borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm },
    rejText: { ...typography.bodySm, color: colors.onErrorContainer },
    empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, maxHeight: '90%' },
    modalTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.md },
    subLabel: { ...typography.labelMd, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    typeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: colors.outlineVariant },
    typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryFixed + '33' },
    typeText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    attachBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.outlineVariant, borderStyle: 'dashed', borderRadius: 10, padding: spacing.sm, marginBottom: spacing.sm },
    attachText: { ...typography.bodyMd, color: colors.primary, flex: 1 },
    btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    half: { flex: 1 },
});
