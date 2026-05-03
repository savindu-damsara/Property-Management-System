import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { maintenanceAPI, leasesAPI } from '../../services/api';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors, typography, spacing } from '../../constants/theme';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const PRIORITY_COLORS = {
    low: '#2e7d32', medium: '#e65100', high: '#bf360c', urgent: colors.error,
};

export default function MaintenanceTenantScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [requests, setRequests] = useState([]);
    const [activeProperties, setActiveProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [createModal, setCreateModal] = useState(false);
    const [form, setForm] = useState({ property: '', title: '', description: '', priority: 'medium' });
    const [image, setImage] = useState(null);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState('all');

    const load = useCallback(async () => {
        try {
            const [maintRes, leasesRes] = await Promise.all([maintenanceAPI.getAll(), leasesAPI.getAll()]);
            setRequests(maintRes.data || []);

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

    const pickImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
        if (!r.canceled && r.assets?.[0]) setImage(r.assets[0]);
    };

    const handleCreate = async () => {
        if (!form.property) { Alert.alert('Info', 'Please select a property first.'); return; }
        if (!form.title || !form.description) { Alert.alert('Info', 'Title and description required'); return; }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('property', form.property);
            fd.append('title', form.title);
            fd.append('description', form.description);
            fd.append('priority', form.priority);
            if (image) fd.append('image', { uri: image.uri, type: 'image/jpeg', name: 'maintenance.jpg' });
            await maintenanceAPI.create(fd);
            setCreateModal(false); setImage(null); load();
            Alert.alert('Submitted', 'Maintenance request sent to property owner for approval.');
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const handleDelete = (id) => {
        Alert.alert('Cancel Request', 'This will send a cancellation request to the owner.', [
            { text: 'No', style: 'cancel' },
            { text: 'Send', style: 'destructive', onPress: async () => { try { await maintenanceAPI.delete(id); load(); } catch (err) { Alert.alert('Error', 'Failed'); } } },
        ]);
    };

    const FILTERS = ['all', 'pending_approval', 'approved', 'in_progress', 'completed', 'rejected'];
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
                {filtered.map(item => (
                    <Card key={item._id} style={styles.card}>
                        <View style={styles.cardTop}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.reqTitle} numberOfLines={1}>{item.title}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                    <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[item.priority] }]} />
                                    <Text style={styles.priorityLabel}>{item.priority.toUpperCase()}</Text>
                                </View>
                            </View>
                            <Badge status={item.status} />
                        </View>
                        <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
                        {item.status === 'rejected' && item.rejectionReason && (
                            <View style={styles.rejBox}><Text style={styles.rejText}>Reason: {item.rejectionReason}</Text></View>
                        )}
                        {['pending_approval', 'approved'].includes(item.status) && (
                            <Button title="Cancel Request" variant="outline" size="sm" style={{ marginTop: spacing.sm }} onPress={() => handleDelete(item._id)} />
                        )}
                    </Card>
                ))}
                {filtered.length === 0 && !loading && (
                    <View style={styles.empty}><Ionicons name="build-outline" size={54} color={colors.outlineVariant} /><Text style={styles.emptyText}>No maintenance requests</Text></View>
                )}
                <Button title="Report an Issue" onPress={() => { setCreateModal(true); setForm({ title: '', description: '', priority: 'medium' }); setImage(null); }} style={{ marginTop: spacing.md }} icon={<Ionicons name="add" size={18} color={colors.onPrimary} />} />
            </ScrollView>

            <Modal visible={createModal} transparent animationType="slide" onRequestClose={() => setCreateModal(false)}>
                <View style={styles.overlay}>
                    <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
                        <Text style={styles.modalTitle}>Report Maintenance Issue</Text>

                        <Text style={styles.subLabel}>Property</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                                {activeProperties.length === 0 && <Text style={{ ...typography.bodySm, color: colors.error }}>No active leases available.</Text>}
                                {activeProperties.map(p => (
                                    <TouchableOpacity key={p._id} style={[styles.pChip, form.property === p._id && { borderColor: colors.primary, backgroundColor: colors.primaryFixed + '33' }]} onPress={() => setForm(pr => ({ ...pr, property: p._id }))}>
                                        <Text style={[styles.pText, form.property === p._id && { color: colors.primary }]}>{p.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <Input label="Issue Title" placeholder="e.g. Leaking roof in bedroom" value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v }))} />
                        <Input label="Description" placeholder="Describe the issue in detail..." value={form.description} onChangeText={v => setForm(p => ({ ...p, description: v }))} multiline numberOfLines={4} />
                        <Text style={styles.subLabel}>Priority</Text>
                        <View style={styles.priorityRow}>
                            {PRIORITIES.map(p => (
                                <TouchableOpacity key={p} style={[styles.pChip, form.priority === p && { borderColor: PRIORITY_COLORS[p], backgroundColor: PRIORITY_COLORS[p] + '22' }]} onPress={() => setForm(pr => ({ ...pr, priority: p }))}>
                                    <Text style={[styles.pText, form.priority === p && { color: PRIORITY_COLORS[p] }]}>{p.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.imgBtn} onPress={pickImage}>
                            <Ionicons name="camera-outline" size={18} color={colors.primary} />
                            <Text style={styles.imgBtnText}>{image ? image.fileName || 'Image selected' : 'Attach Photo (optional)'}</Text>
                        </TouchableOpacity>
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
    filterBar: { maxHeight: 50, paddingHorizontal: spacing.margin },
    filterChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: colors.outlineVariant, marginRight: spacing.sm, alignSelf: 'center' },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    filterTextActive: { color: colors.onPrimary },
    scroll: { padding: spacing.margin, paddingBottom: 80 },
    card: { marginBottom: spacing.sm, padding: spacing.md },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
    reqTitle: { ...typography.h3, fontSize: 15, color: colors.onSurface },
    priorityDot: { width: 8, height: 8, borderRadius: 4 },
    priorityLabel: { ...typography.labelMd, fontSize: 10 },
    description: { ...typography.bodyMd, color: colors.onSurface },
    rejBox: { backgroundColor: colors.errorContainer, borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm },
    rejText: { ...typography.bodySm, color: colors.onErrorContainer },
    empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, maxHeight: '90%' },
    modalTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.md },
    subLabel: { ...typography.labelMd, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
    priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    pChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: colors.outlineVariant },
    pText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    imgBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.outlineVariant, borderStyle: 'dashed', borderRadius: 10, padding: spacing.sm, marginBottom: spacing.sm },
    imgBtnText: { ...typography.bodyMd, color: colors.primary, flex: 1 },
    btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    half: { flex: 1 },
});
