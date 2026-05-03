import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
    RefreshControl, Modal, Platform, TextInput, KeyboardAvoidingView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { billsAPI, leasesAPI, authAPI } from '../../services/api';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors, typography, spacing } from '../../constants/theme';

const formatLKR = (n) => `LKR ${Number(n || 0).toLocaleString()}`;
const MAX_DESC = 100;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

const formatDate = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const ymToLabel = (ym) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    return `${MONTH_LABELS[parseInt(m, 10) - 1]} ${y}`;
};

const BILL_TYPES = ['rent', 'utility', 'maintenance', 'other'];

const emptyForm = () => ({
    property: '', title: '', description: '', amount: '',
    paidDate: new Date(), billType: 'rent', rentMonth: '',
});

export default function BillingTenantScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [data, setData] = useState({ bills: [], stats: {}, monthlySchedule: [] });
    const [allLeases, setAllLeases] = useState([]);
    const [activeProperties, setActiveProperties] = useState([]);
    const [agreedRent, setAgreedRent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');

    // ─── Submit / Edit modal state ──────────────────────────────────────────
    const [createModal, setCreateModal] = useState(false);
    const [editingBill, setEditingBill] = useState(null); // bill being directly edited (pending)
    const [form, setForm] = useState(emptyForm());
    const [doc, setDoc] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    // ─── Request Edit modal (approved bills) ────────────────────────────────
    const [reqEditModal, setReqEditModal] = useState(null);
    const [reqEditForm, setReqEditForm] = useState({ title: '', description: '', amount: '', paidDate: new Date(), rentMonth: '' });
    const [reqEditDoc, setReqEditDoc] = useState(null);
    const [reqEditPicker, setReqEditPicker] = useState(false);
    const [reqEditing, setReqEditing] = useState(false);

    // ─── Request Delete modal (approved bills) ──────────────────────────────
    const [reqDeleteModal, setReqDeleteModal] = useState(null);
    const [reqDeleteReason, setReqDeleteReason] = useState('');
    const [reqDeleting, setReqDeleting] = useState(false);

    // ─── Data loading ────────────────────────────────────────────────────────
    const loadBillsForProperty = useCallback(async (propId) => {
        try {
            const params = propId ? { property: propId } : {};
            const res = await billsAPI.getAll(params);
            setData(res.data || { bills: [], stats: {}, monthlySchedule: [] });
        } catch (err) { console.log(err?.message); }
    }, []);

    const load = useCallback(async () => {
        try {
            const leasesRes = await leasesAPI.getAll();
            const leasesList = leasesRes.data || [];
            setAllLeases(leasesList);

            const activePropMap = {};
            leasesList.forEach(l => {
                if (l.status === 'active' && l.property) activePropMap[l.property._id] = l.property;
            });
            const props = Object.values(activePropMap);
            setActiveProperties(props);

            const defaultProp = props.length > 0 ? props[0]._id : '';
            const activeLease = leasesList.find(l => l.status === 'active' && l.property?._id === defaultProp);
            setAgreedRent(activeLease?.rentAmount ?? null);
            setForm(p => ({ ...p, property: defaultProp }));
            await loadBillsForProperty(defaultProp);
        } catch (err) { console.log(err?.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, [loadBillsForProperty]);

    useFocusEffect(useCallback(() => {
        load();
        authAPI.clearNotification('bills').catch(() => { });
    }, [load]));

    useEffect(() => { load(); }, [load]);

    const onPropertySelect = useCallback(async (propId) => {
        setForm(p => ({ ...p, property: propId, rentMonth: '' }));
        const activeLease = allLeases.find(l => l.status === 'active' && l.property?._id === propId);
        setAgreedRent(activeLease?.rentAmount ?? null);
        await loadBillsForProperty(propId);
    }, [allLeases, loadBillsForProperty]);

    // ─── File picker ─────────────────────────────────────────────────────────
    const pickDoc = async (setter) => {
        const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'] });
        if (!r.canceled && r.assets?.[0]) {
            const asset = r.assets[0];
            if (asset.size && asset.size > MAX_FILE_BYTES) {
                Alert.alert('File Too Large', 'Please upload a PDF under 50 MB.');
                return;
            }
            setter(asset);
        }
    };

    // ─── Date picker helpers ─────────────────────────────────────────────────
    const makeDatePicker = (value, onChange, visible, setVisible) => {
        if (!visible) return null;
        if (Platform.OS === 'ios') {
            return (
                <Modal visible transparent animationType="slide">
                    <TouchableOpacity style={styles.pickerOverlay} onPress={() => setVisible(false)} activeOpacity={1}>
                        <View style={styles.pickerSheet} onStartShouldSetResponder={() => true}>
                            <DateTimePicker
                                value={value instanceof Date ? value : new Date(value)}
                                mode="date" display="spinner"
                                themeVariant="light" textColor="#000000"
                                onChange={(_, d) => { if (d) onChange(d); }}
                                style={{ height: 200, width: '100%' }}
                            />
                            <Button title="Done" onPress={() => setVisible(false)} />
                        </View>
                    </TouchableOpacity>
                </Modal>
            );
        }
        return (
            <DateTimePicker
                value={value instanceof Date ? value : new Date(value)}
                mode="date" display="default"
                onChange={({ type }, d) => {
                    setVisible(false);
                    if (type === 'set' && d) onChange(d);
                }}
            />
        );
    };

    // ─── Submit / Edit Handlers ───────────────────────────────────────────────
    const openCreateModal = () => {
        if (activeProperties.length === 0) {
            Alert.alert('No Active Lease', 'You need an active lease to submit payments.');
            return;
        }
        setEditingBill(null);
        setForm(p => ({ ...emptyForm(), property: p.property }));
        setDoc(null);
        setCreateModal(true);
    };

    const openEditModal = (bill) => {
        setEditingBill(bill);
        setForm({
            property: bill.property?._id || bill.property,
            title: bill.title,
            description: bill.description || '',
            amount: String(bill.amount),
            paidDate: new Date(bill.paidDate),
            billType: bill.billType,
            rentMonth: bill.rentMonth || '',
        });
        setDoc(null);
        setCreateModal(true);
    };

    const handleSave = async () => {
        if (!form.property) { Alert.alert('Property Required', 'Please select a property.'); return; }
        if (!form.title.trim() || !form.amount || !form.paidDate) { Alert.alert('Missing Fields', 'Title, amount and date are required.'); return; }
        if (Number(form.amount) <= 0) { Alert.alert('Invalid Amount', 'Amount must be greater than zero.'); return; }
        if (form.billType === 'rent' && !form.rentMonth) { Alert.alert('Rent Month Required', 'Please select which month this rent payment is for.'); return; }
        if (form.billType !== 'rent' && !form.description.trim()) { Alert.alert('Description Required', `Please describe what this ${form.billType} payment covers.`); return; }
        if (!editingBill && !doc) { Alert.alert('Receipt Required', 'Please upload a receipt (PDF) before submitting.'); return; }

        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('property', form.property);
            fd.append('title', form.title.trim());
            fd.append('description', form.description.slice(0, MAX_DESC));
            fd.append('amount', form.amount);
            fd.append('paidDate', (form.paidDate instanceof Date ? form.paidDate : new Date(form.paidDate)).toISOString());
            fd.append('billType', form.billType);
            if (form.billType === 'rent') fd.append('rentMonth', form.rentMonth);
            if (doc) fd.append('document', { uri: doc.uri, type: 'application/pdf', name: doc.name });

            if (editingBill) {
                await billsAPI.edit(editingBill._id, fd);
                Alert.alert('Updated', 'Payment updated successfully.');
            } else {
                await billsAPI.create(fd);
                Alert.alert('Submitted', 'Payment submitted for owner approval.');
            }
            setCreateModal(false);
            setDoc(null);
            await loadBillsForProperty(form.property);
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed.'); }
        finally { setSaving(false); }
    };

    const handleDelete = (bill) => {
        Alert.alert('Delete Payment', 'Are you sure you want to delete this payment? This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await billsAPI.remove(bill._id);
                        await loadBillsForProperty(form.property);
                    } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed to delete.'); }
                }
            }
        ]);
    };

    // ─── Request Edit Handler ─────────────────────────────────────────────────
    const openReqEdit = (bill) => {
        setReqEditModal(bill);
        setReqEditForm({
            title: bill.title, description: bill.description || '',
            amount: String(bill.amount),
            paidDate: new Date(bill.paidDate),
            rentMonth: bill.rentMonth || '',
        });
        setReqEditDoc(null);
    };

    const handleReqEdit = async () => {
        if (!reqEditForm.title.trim() || !reqEditForm.amount) { Alert.alert('Missing Fields', 'Title and amount are required.'); return; }
        setReqEditing(true);
        try {
            const fd = new FormData();
            fd.append('title', reqEditForm.title.trim());
            fd.append('description', reqEditForm.description.slice(0, MAX_DESC));
            fd.append('amount', reqEditForm.amount);
            fd.append('paidDate', (reqEditForm.paidDate instanceof Date ? reqEditForm.paidDate : new Date(reqEditForm.paidDate)).toISOString());
            if (reqEditForm.rentMonth) fd.append('rentMonth', reqEditForm.rentMonth);
            if (reqEditDoc) fd.append('document', { uri: reqEditDoc.uri, type: 'application/pdf', name: reqEditDoc.name });
            await billsAPI.requestEdit(reqEditModal._id, fd);
            setReqEditModal(null);
            await loadBillsForProperty(form.property);
            Alert.alert('Requested', 'Edit request submitted to the owner.');
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed.'); }
        finally { setReqEditing(false); }
    };

    // ─── Request Delete Handler ───────────────────────────────────────────────
    const handleReqDelete = async () => {
        setReqDeleting(true);
        try {
            await billsAPI.requestDelete(reqDeleteModal._id, { reason: reqDeleteReason.trim() });
            setReqDeleteModal(null); setReqDeleteReason('');
            await loadBillsForProperty(form.property);
            Alert.alert('Requested', 'Deletion request submitted to the owner.');
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed.'); }
        finally { setReqDeleting(false); }
    };

    const bills = data.bills || [];
    const stats = data.stats || {};
    const schedule = data.monthlySchedule || [];
    const filtered = filter === 'all' ? bills : bills.filter(b => b.status === filter);
    const FILTERS = ['all', 'pending_approval', 'approved', 'rejected'];

    // Unpaid/Partial months for rent-month selector
    const unpaidMonths = schedule.filter(s => s.status === 'unpaid' || s.status === 'partial');

    // Compute remaining rent from LEASE agreement rent amount (not property listing price)
    const computedRemainingRent = (() => {
        if (!agreedRent || schedule.length === 0) return stats.remainingRent ?? 0;
        const totalOwed = schedule.length * agreedRent;
        const totalRentPaid = bills
            .filter(b => b.billType === 'rent' && b.status === 'approved')
            .reduce((s, b) => s + b.amount, 0);
        return Math.max(0, totalOwed - totalRentPaid);
    })();

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.sm }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Billing</Text>
            </View>

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'android' ? 150 : 40 }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}>
                {/* Stats */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
                        <Text style={[styles.sLabel, { color: colors.onPrimary + 'cc' }]}>Total Paid</Text>
                        <Text style={[styles.sVal, { color: colors.onPrimary }]}>{formatLKR(stats.totalPaid)}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: computedRemainingRent > 0 ? colors.errorContainer : colors.secondaryContainer }]}>
                        <Ionicons name="alert-circle" size={20} color={computedRemainingRent > 0 ? colors.onErrorContainer : colors.onSecondaryContainer} />
                        <Text style={[styles.sLabel, { color: colors.onSurface + 'cc' }]}>Remaining Rent</Text>
                        <Text style={[styles.sVal, { color: computedRemainingRent > 0 ? colors.error : colors.onSecondaryContainer }]}>{formatLKR(computedRemainingRent)}</Text>
                    </View>
                </View>

                {agreedRent !== null && (
                    <View style={styles.agreedBanner}>
                        <Ionicons name="home-outline" size={15} color={colors.primary} />
                        <Text style={styles.agreedText}>Agreed Rent: <Text style={{ fontWeight: '700' }}>{formatLKR(agreedRent)}</Text> / month</Text>
                    </View>
                )}

                {/* Monthly Payment Tracker */}
                {schedule.length > 0 && (
                    <Card style={styles.trackerCard}>
                        <Text style={styles.trackerTitle}>Monthly Rent Tracker</Text>
                        {schedule.map(entry => (
                            <View key={entry.month} style={styles.trackerRow}>
                                <Text style={styles.trackerMonth}>{entry.label}</Text>
                                <Text style={styles.trackerDue}>Due: {new Date(entry.dueDate).getDate()}th</Text>
                                <View style={[
                                    styles.trackerBadge,
                                    entry.status === 'paid' && { backgroundColor: colors.secondaryContainer },
                                    entry.status === 'pending' && { backgroundColor: '#fff3e0' },
                                    entry.status === 'partial' && { backgroundColor: '#e3f2fd' },
                                    entry.status === 'unpaid' && { backgroundColor: colors.errorContainer },
                                ]}>
                                    <Text style={[
                                        styles.trackerBadgeText,
                                        entry.status === 'paid' && { color: colors.onSecondaryContainer },
                                        entry.status === 'pending' && { color: '#e65100' },
                                        entry.status === 'partial' && { color: '#1565c0' },
                                        entry.status === 'unpaid' && { color: colors.onErrorContainer },
                                    ]}>
                                        {entry.status === 'paid' ? '✓ Paid' : entry.status === 'pending' ? '⏳ Pending' : entry.status === 'partial' ? '½ Partial' : '✗ Unpaid'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </Card>
                )}

                {/* Filter Chips */}
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

                {/* Bill Cards */}
                {filtered.map(item => (
                    <Card key={item._id} style={styles.card}>
                        <View style={styles.cardTop}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.billTitle}>{item.title}</Text>
                                <Text style={styles.billMeta}>
                                    {item.billType[0].toUpperCase() + item.billType.slice(1)}
                                    {item.rentMonth ? ` · ${ymToLabel(item.rentMonth)}` : ''}
                                    {' · '}{formatDate(item.paidDate)}
                                </Text>
                                {item.property?.title && <Text style={styles.billProp} numberOfLines={1}>{item.property.title}</Text>}
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                <Text style={styles.billAmt}>{formatLKR(item.amount)}</Text>
                                <Badge status={item.status} />
                            </View>
                        </View>
                        {item.description ? <Text style={styles.billDesc}>{item.description}</Text> : null}
                        {item.status === 'rejected' && item.rejectionReason && (
                            <View style={styles.rejBox}><Text style={styles.rejText}>Rejected: {item.rejectionReason}</Text></View>
                        )}

                        {/* Edit request status */}
                        {item.editRequest?.status === 'pending' && (
                            <View style={[styles.reqBanner, { backgroundColor: '#fff3e0' }]}>
                                <Ionicons name="create-outline" size={14} color="#e65100" />
                                <Text style={{ ...typography.bodySm, color: '#e65100' }}>Edit request pending owner review</Text>
                            </View>
                        )}
                        {item.editRequest?.status === 'rejected' && (
                            <View style={styles.rejBox}><Text style={styles.rejText}>Edit rejected: {item.editRequest.rejectionReason}</Text></View>
                        )}
                        {/* Delete request status */}
                        {item.deleteRequest?.status === 'pending' && (
                            <View style={[styles.reqBanner, { backgroundColor: colors.errorContainer + '66' }]}>
                                <Ionicons name="trash-outline" size={14} color={colors.error} />
                                <Text style={{ ...typography.bodySm, color: colors.error }}>Deletion request pending owner review</Text>
                            </View>
                        )}
                        {item.deleteRequest?.status === 'rejected' && (
                            <View style={styles.rejBox}><Text style={styles.rejText}>Deletion rejected: {item.deleteRequest.rejectionReason}</Text></View>
                        )}

                        {/* Actions for pending_approval bills */}
                        {item.status === 'pending_approval' && (
                            <View style={styles.btnRow}>
                                <Button title="Edit" variant="outline" size="sm" style={styles.half}
                                    icon={<Ionicons name="create-outline" size={14} color={colors.primary} />}
                                    onPress={() => openEditModal(item)} />
                                <Button title="Delete" variant="danger" size="sm" style={styles.half}
                                    onPress={() => handleDelete(item)} />
                            </View>
                        )}
                        {/* Actions for approved bills (requests) */}
                        {item.status === 'approved' && !item.editRequest?.status?.match(/pending/) && !item.deleteRequest?.status?.match(/pending/) && (
                            <View style={styles.btnRow}>
                                <Button title="Request Edit" variant="outline" size="sm" style={styles.half}
                                    icon={<Ionicons name="create-outline" size={14} color={colors.primary} />}
                                    onPress={() => openReqEdit(item)} />
                                <Button title="Request Delete" variant="danger" size="sm" style={styles.half}
                                    onPress={() => { setReqDeleteModal(item); setReqDeleteReason(''); }} />
                            </View>
                        )}
                    </Card>
                ))}
                {filtered.length === 0 && !loading && (
                    <View style={styles.empty}>
                        <Ionicons name="card-outline" size={54} color={colors.outlineVariant} />
                        <Text style={styles.emptyText}>No payments found</Text>
                    </View>
                )}

                <Button title="Submit Payment" onPress={openCreateModal} style={{ marginTop: spacing.md }}
                    icon={<Ionicons name="add" size={18} color={colors.onPrimary} />} />
            </ScrollView>

            {/* ── Date Pickers ───────────────────────────────────────────── */}
            {makeDatePicker(form.paidDate, (d) => setForm(p => ({ ...p, paidDate: d })), showPicker, setShowPicker)}
            {makeDatePicker(reqEditForm.paidDate, (d) => setReqEditForm(p => ({ ...p, paidDate: d })), reqEditPicker, setReqEditPicker)}

            {/* ── Submit / Edit Modal ─────────────────────────────────────── */}
            <Modal visible={createModal} transparent animationType="slide" onRequestClose={() => setCreateModal(false)}>
                <View style={styles.overlay}>
                    <ScrollView style={[styles.modal, { paddingBottom: Platform.OS === 'android' ? 150 : 40 }]} keyboardShouldPersistTaps="handled">
                        <Text style={styles.modalTitle}>{editingBill ? 'Edit Payment' : 'Submit Payment'}</Text>

                        {/* Property selector */}
                        <Text style={styles.subLabel}>Property *</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                            <View style={styles.typeRow}>
                                {activeProperties.length === 0 && <Text style={{ ...typography.bodySm, color: colors.error }}>No active leases.</Text>}
                                {activeProperties.map(p => (
                                    <TouchableOpacity key={p._id}
                                        style={[styles.typeChip, form.property === p._id && styles.typeChipActive]}
                                        onPress={() => !editingBill && onPropertySelect(p._id)}>
                                        <Text style={[styles.typeText, form.property === p._id && { color: colors.primary }]}>{p.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {agreedRent !== null && (
                            <View style={[styles.agreedBanner, { marginBottom: spacing.md }]}>
                                <Ionicons name="home-outline" size={14} color={colors.primary} />
                                <Text style={styles.agreedText}>Agreed Rent: <Text style={{ fontWeight: '700' }}>{formatLKR(agreedRent)}</Text>/mo</Text>
                            </View>
                        )}

                        <Input label="Title *" placeholder="e.g. May 2026 Rent" value={form.title}
                            onChangeText={v => setForm(p => ({ ...p, title: v }))} />
                        <Input label="Amount (LKR) *" placeholder="50000" value={form.amount}
                            onChangeText={v => setForm(p => ({ ...p, amount: v }))} keyboardType="numeric" />

                        {/* Paid Date */}
                        <Text style={styles.subLabel}>Paid Date *</Text>
                        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker(true)}>
                            <Ionicons name="calendar" size={18} color={colors.primary} />
                            <Text style={styles.dateBtnText}>{formatDate(form.paidDate instanceof Date ? form.paidDate : new Date(form.paidDate))}</Text>
                            <Ionicons name="chevron-down" size={16} color={colors.onSurfaceVariant} />
                        </TouchableOpacity>

                        {/* Bill Type */}
                        <Text style={styles.subLabel}>Bill Type</Text>
                        <View style={styles.typeRow}>
                            {BILL_TYPES.map(t => (
                                <TouchableOpacity key={t} style={[styles.typeChip, form.billType === t && styles.typeChipActive]}
                                    onPress={() => setForm(p => ({ ...p, billType: t, rentMonth: t !== 'rent' ? '' : p.rentMonth }))}>
                                    <Text style={[styles.typeText, form.billType === t && { color: colors.primary }]}>
                                        {t[0].toUpperCase() + t.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Rent Month selector */}
                        {form.billType === 'rent' && (
                            <>
                                <Text style={styles.subLabel}>Rent Month *</Text>
                                {unpaidMonths.length === 0 ? (
                                    <View style={[styles.agreedBanner, { marginBottom: spacing.md }]}>
                                        <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                                        <Text style={styles.agreedText}>No outstanding rent months — all paid!</Text>
                                    </View>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                                        <View style={styles.typeRow}>
                                            {unpaidMonths.map(s => (
                                                <TouchableOpacity key={s.month}
                                                    style={[styles.typeChip, form.rentMonth === s.month && styles.typeChipActive]}
                                                    onPress={() => setForm(p => ({ ...p, rentMonth: s.month }))}>
                                                    <Text style={[styles.typeText, form.rentMonth === s.month && { color: colors.primary }]}>{s.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                )}
                            </>
                        )}

                        {/* Description */}
                        <View style={{ marginBottom: spacing.sm, marginTop: spacing.xs }}>
                            <Input label={form.billType === 'rent' ? "Description (optional)" : "Description *"} placeholder="Explain payment details..."
                                value={form.description}
                                onChangeText={v => setForm(p => ({ ...p, description: v.slice(0, MAX_DESC) }))}
                                multiline numberOfLines={2} maxLength={MAX_DESC} />
                            {form.billType !== 'rent' && (
                                <Text style={{ ...typography.bodySm, color: '#e65100', marginTop: -spacing.sm, marginBottom: spacing.sm }}>
                                    Please describe what this {form.billType} payment covers.
                                </Text>
                            )}
                            <Text style={[styles.charCounter, { marginTop: form.billType !== 'rent' ? -spacing.sm : 0 }]}>{form.description.length}/{MAX_DESC}</Text>
                        </View>

                        {/* Upload */}
                        <TouchableOpacity style={styles.attachBtn} onPress={() => pickDoc(setDoc)}>
                            <Ionicons name="document-attach" size={18} color={colors.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.attachText} numberOfLines={1}>{doc ? doc.name : 'Upload Receipt (PDF)'}</Text>
                                <Text style={styles.attachHint}>PDF only · Max 50 MB</Text>
                            </View>
                            {doc && <TouchableOpacity onPress={() => setDoc(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close-circle" size={18} color={colors.error} />
                            </TouchableOpacity>}
                        </TouchableOpacity>

                        <View style={styles.btnRow}>
                            <Button title="Cancel" variant="ghost" style={styles.half} onPress={() => setCreateModal(false)} />
                            <Button title={editingBill ? 'Save Changes' : 'Submit'} style={styles.half} loading={saving} onPress={handleSave} />
                        </View>
                        {makeDatePicker(form.paidDate, d => setForm(p => ({ ...p, paidDate: d })), showPicker, setShowPicker)}
                    </ScrollView>
                </View>
            </Modal>

            {/* ── Request Edit Modal ──────────────────────────────────────── */}
            <Modal visible={!!reqEditModal} transparent animationType="slide" onRequestClose={() => setReqEditModal(null)}>
                <View style={styles.overlay}>
                    <ScrollView style={[styles.modal, { paddingBottom: Platform.OS === 'android' ? 150 : 40 }]} keyboardShouldPersistTaps="handled">
                        <Text style={styles.modalTitle}>Request Edit</Text>
                        <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.md }}>
                            The owner will review your edit request before applying changes.
                        </Text>
                        <Input label="Title *" value={reqEditForm.title}
                            onChangeText={v => setReqEditForm(p => ({ ...p, title: v }))} />
                        <Input label="Amount (LKR) *" value={reqEditForm.amount}
                            onChangeText={v => setReqEditForm(p => ({ ...p, amount: v }))} keyboardType="numeric" />
                        <Text style={styles.subLabel}>Paid Date</Text>
                        <TouchableOpacity style={styles.dateBtn} onPress={() => setReqEditPicker(true)}>
                            <Ionicons name="calendar" size={18} color={colors.primary} />
                            <Text style={styles.dateBtnText}>{formatDate(reqEditForm.paidDate instanceof Date ? reqEditForm.paidDate : new Date(reqEditForm.paidDate))}</Text>
                            <Ionicons name="chevron-down" size={16} color={colors.onSurfaceVariant} />
                        </TouchableOpacity>
                        <View style={{ marginBottom: spacing.sm }}>
                            <Input label="Description" value={reqEditForm.description}
                                onChangeText={v => setReqEditForm(p => ({ ...p, description: v.slice(0, MAX_DESC) }))}
                                multiline numberOfLines={2} maxLength={MAX_DESC} />
                            <Text style={styles.charCounter}>{reqEditForm.description.length}/{MAX_DESC}</Text>
                        </View>
                        <TouchableOpacity style={styles.attachBtn} onPress={() => pickDoc(setReqEditDoc)}>
                            <Ionicons name="document-attach" size={18} color={colors.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.attachText} numberOfLines={1}>{reqEditDoc ? reqEditDoc.name : 'Replace Receipt (optional, PDF)'}</Text>
                                <Text style={styles.attachHint}>PDF only · Max 50 MB</Text>
                            </View>
                        </TouchableOpacity>
                        <View style={styles.btnRow}>
                            <Button title="Cancel" variant="ghost" style={styles.half} onPress={() => setReqEditModal(null)} />
                            <Button title="Send Request" style={styles.half} loading={reqEditing} onPress={handleReqEdit} />
                        </View>
                        {makeDatePicker(reqEditForm.paidDate, d => setReqEditForm(p => ({ ...p, paidDate: d })), reqEditPicker, setReqEditPicker)}
                    </ScrollView>
                </View>
            </Modal>

            {/* ── Request Delete Modal ────────────────────────────────────── */}
            <Modal visible={!!reqDeleteModal} transparent animationType="slide" onRequestClose={() => setReqDeleteModal(null)}>
                <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Request Deletion</Text>
                        <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.md }}>
                            Provide a reason. The owner must approve before the record is removed.
                        </Text>
                        <TextInput
                            style={styles.reasonInput}
                            placeholder="Reason for deletion..."
                            placeholderTextColor={colors.outline}
                            value={reqDeleteReason}
                            onChangeText={setReqDeleteReason}
                            multiline numberOfLines={3}
                        />
                        <View style={styles.btnRow}>
                            <Button title="Cancel" variant="ghost" style={styles.half} onPress={() => setReqDeleteModal(null)} />
                            <Button title="Send Request" variant="danger" style={styles.half} loading={reqDeleting}
                                onPress={() => { if (!reqDeleteReason.trim()) { Alert.alert('Reason required'); return; } handleReqDelete(); }} />
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
    scroll: { padding: spacing.margin, paddingBottom: 90 },
    statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    statCard: { flex: 1, borderRadius: 16, padding: spacing.md, gap: 4 },
    sLabel: { ...typography.bodySm },
    sVal: { ...typography.h3, fontSize: 16 },
    agreedBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primaryFixed + '22', borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 8, marginBottom: spacing.md },
    agreedText: { ...typography.bodySm, color: colors.primary },
    // Tracker
    trackerCard: { marginBottom: spacing.md, padding: spacing.md },
    trackerTitle: { ...typography.h3, fontSize: 14, color: colors.onSurface, marginBottom: spacing.sm },
    trackerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant + '55' },
    trackerMonth: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
    trackerDue: { ...typography.bodySm, color: colors.onSurfaceVariant, marginRight: spacing.sm },
    trackerBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    trackerBadgeText: { ...typography.labelMd, fontSize: 11 },
    // Filters & chips
    filterChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: colors.outlineVariant },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    filterTextActive: { color: colors.onPrimary },
    // Cards
    card: { marginBottom: spacing.sm, padding: spacing.md },
    cardTop: { flexDirection: 'row', gap: spacing.sm },
    billTitle: { ...typography.h3, fontSize: 15, color: colors.onSurface },
    billMeta: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
    billProp: { ...typography.bodySm, color: colors.primary, marginTop: 1 },
    billAmt: { ...typography.h3, color: colors.primary },
    billDesc: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: spacing.xs },
    rejBox: { backgroundColor: colors.errorContainer, borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm },
    rejText: { ...typography.bodySm, color: colors.onErrorContainer },
    reqBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, padding: spacing.sm, marginTop: spacing.xs },
    btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    half: { flex: 1 },
    empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    // Modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, maxHeight: '92%' },
    modalTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.md },
    subLabel: { ...typography.labelMd, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    typeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: colors.outlineVariant },
    typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryFixed + '33' },
    typeText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    dateBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
    dateBtnText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
    charCounter: { ...typography.bodySm, color: colors.onSurfaceVariant, textAlign: 'right', marginTop: -spacing.sm, marginBottom: spacing.sm, paddingRight: 4 },
    attachBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.outlineVariant, borderStyle: 'dashed', borderRadius: 10, padding: spacing.sm, marginBottom: spacing.sm },
    attachText: { ...typography.bodyMd, color: colors.primary },
    attachHint: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
    reasonInput: { borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 12, padding: spacing.md, ...typography.bodyMd, color: colors.onSurface, height: 90, textAlignVertical: 'top', marginBottom: spacing.sm },
    // iOS date picker sheet
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    pickerSheet: { backgroundColor: colors.surfaceContainerLowest, padding: spacing.xl, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
});
