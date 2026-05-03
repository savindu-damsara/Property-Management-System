import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { maintenanceAPI, leasesAPI, authAPI, BASE_URL } from '../../services/api';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors, typography, spacing } from '../../constants/theme';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const PRIORITY_COLORS = {
    low: '#2e7d32', medium: '#e65100', high: '#bf360c', urgent: colors.error,
};

const MAX_TITLE = 30;
const MAX_DESC = 100;
const MAX_IMAGES = 5;

const emptyForm = () => ({ property: '', title: '', description: '', priority: 'medium' });

export default function MaintenanceTenantScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [requests, setRequests] = useState([]);
    const [activeProperties, setActiveProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');

    // Create / Edit Direct Modal
    const [createModal, setCreateModal] = useState(false);
    const [editingMaint, setEditingMaint] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [images, setImages] = useState([]);
    const [saving, setSaving] = useState(false);

    // Request Edit Modal
    const [reqEditModal, setReqEditModal] = useState(null);
    const [reqEditForm, setReqEditForm] = useState(emptyForm());
    const [reqEditImages, setReqEditImages] = useState([]);
    const [reqEditing, setReqEditing] = useState(false);

    // Request Delete Modal
    const [reqDeleteModal, setReqDeleteModal] = useState(null);
    const [reqDeleteReason, setReqDeleteReason] = useState('');
    const [reqDeleting, setReqDeleting] = useState(false);

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
            if (props.length > 0 && !form.property) setForm(p => ({ ...p, property: props[0]._id }));
        }
        catch (err) { console.log(err?.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, [form.property]);

    useFocusEffect(useCallback(() => {
        load();
        authAPI.clearNotification('maintenance').catch(() => { });
    }, [load]));

    useEffect(() => { load(); }, [load]);

    const pickImage = async (currentImages, setImagesFunc) => {
        if (currentImages.length >= MAX_IMAGES) {
            Alert.alert('Limit Reached', `You can only upload up to ${MAX_IMAGES} photos.`);
            return;
        }
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsMultipleSelection: true, selectionLimit: MAX_IMAGES - currentImages.length });
        if (!r.canceled && r.assets) {
            setImagesFunc([...currentImages, ...r.assets]);
        }
    };

    const removeImage = (index, currentImages, setImagesFunc) => {
        const newImgs = [...currentImages];
        newImgs.splice(index, 1);
        setImagesFunc(newImgs);
    };

    // ─── Direct Actions (Pending Approval) ────────────────────────────────────────────────
    const openCreate = () => {
        setEditingMaint(null);
        setForm(p => ({ ...emptyForm(), property: p.property }));
        setImages([]);
        setCreateModal(true);
    };

    const openEdit = (maint) => {
        setEditingMaint(maint);
        setForm({
            property: maint.property?._id || maint.property,
            title: maint.title,
            description: maint.description,
            priority: maint.priority,
        });
        setImages([]); // we do not pre-load old images into picker buffer state right now for simplicity, we just allow setting new ones
        setCreateModal(true);
    };

    const handleSave = async () => {
        if (!form.property) { Alert.alert('Error', 'Please select a property.'); return; }
        if (!form.title.trim() || !form.description.trim()) { Alert.alert('Error', 'Title and description required'); return; }
        if (form.title.length > MAX_TITLE || form.description.length > MAX_DESC) { Alert.alert('Error', 'Length limits exceeded.'); return; }

        if (!editingMaint && images.length === 0) {
            Alert.alert('Photo Required', 'At least one photo is required to report a maintenance issue.'); return;
        }

        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('property', form.property);
            fd.append('title', form.title.trim());
            fd.append('description', form.description.slice(0, MAX_DESC));
            fd.append('priority', form.priority);

            if (images.length > 0) {
                images.forEach((img, i) => {
                    fd.append('images', { uri: img.uri, type: 'image/jpeg', name: `maint-${i}.jpg` });
                });
            } else if (editingMaint) {
                // tell backend to keep old images
                fd.append('keepOldImages', 'true');
            }

            if (editingMaint) {
                await maintenanceAPI.editDirectly(editingMaint._id, fd);
                Alert.alert('Updated', 'Maintenance request updated.');
            } else {
                await maintenanceAPI.create(fd);
                Alert.alert('Submitted', 'Maintenance request sent for approval.');
            }
            setCreateModal(false); load();
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const handleDelete = (maint) => {
        Alert.alert('Delete Request', 'Are you sure you want to delete this maintenance request permanently?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await maintenanceAPI.deleteDirectly(maint._id); load(); }
                    catch (err) { Alert.alert('Error', 'Failed to delete.'); }
                }
            }
        ]);
    };

    // ─── Request Actions (Approved/In Progress) ──────────────────────────────────────────
    const openReqEdit = (maint) => {
        setReqEditModal(maint);
        setReqEditForm({
            title: maint.title,
            description: maint.description,
            priority: maint.priority,
        });
        setReqEditImages([]);
    };

    const handleReqEdit = async () => {
        if (!reqEditForm.title.trim() || !reqEditForm.description.trim()) { Alert.alert('Error', 'Title and description required'); return; }
        setReqEditing(true);
        try {
            const fd = new FormData();
            fd.append('title', reqEditForm.title.trim());
            fd.append('description', reqEditForm.description.slice(0, MAX_DESC));
            fd.append('priority', reqEditForm.priority);

            if (reqEditImages.length > 0) {
                reqEditImages.forEach((img, i) => {
                    fd.append('images', { uri: img.uri, type: 'image/jpeg', name: `maint-req-${i}.jpg` });
                });
            } else {
                fd.append('keepOldImages', 'true');
            }

            await maintenanceAPI.requestEdit(reqEditModal._id, fd);
            setReqEditModal(null); load();
            Alert.alert('Requested', 'Edit request sent to owner.');
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed'); }
        finally { setReqEditing(false); }
    };

    const openReqDelete = (maint) => {
        setReqDeleteModal(maint);
        setReqDeleteReason('');
    };

    const handleReqDelete = async () => {
        setReqDeleting(true);
        try {
            await maintenanceAPI.requestDelete(reqDeleteModal._id, { reason: reqDeleteReason.trim() });
            setReqDeleteModal(null); load();
            Alert.alert('Requested', 'Cancellation request sent to owner.');
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed'); }
        finally { setReqDeleting(false); }
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

                        {/* Request Banners */}
                        {item.editRequest?.status === 'pending' && (
                            <View style={styles.reqBanner}>
                                <Ionicons name="create-outline" size={14} color="#e65100" />
                                <Text style={styles.reqBannerText}>Edit pending review</Text>
                            </View>
                        )}
                        {item.deleteRequest?.status === 'pending' && (
                            <View style={[styles.reqBanner, { backgroundColor: colors.errorContainer + '66' }]}>
                                <Ionicons name="trash-outline" size={14} color={colors.error} />
                                <Text style={[styles.reqBannerText, { color: colors.error }]}>Cancellation pending review</Text>
                            </View>
                        )}

                        {item.status === 'rejected' && item.rejectionReason && (
                            <View style={styles.rejBox}><Text style={styles.rejText}>Reason: {item.rejectionReason}</Text></View>
                        )}
                        {item.editRequest?.status === 'rejected' && (
                            <View style={styles.rejBox}><Text style={styles.rejText}>Edit rejected: {item.editRequest.rejectionReason}</Text></View>
                        )}
                        {item.deleteRequest?.status === 'rejected' && (
                            <View style={styles.rejBox}><Text style={styles.rejText}>Cancel rejected: {item.deleteRequest.rejectionReason}</Text></View>
                        )}

                        {item.status === 'pending_approval' && (
                            <View style={styles.actionRow}>
                                <Button title="Edit" variant="outline" size="sm" style={styles.half} onPress={() => openEdit(item)} />
                                <Button title="Delete" variant="danger" size="sm" style={styles.half} onPress={() => handleDelete(item)} />
                            </View>
                        )}
                        {['approved', 'in_progress'].includes(item.status) && (
                            <View style={styles.actionRow}>
                                <Button title="Request Edit" variant="outline" size="sm" style={styles.half} onPress={() => openReqEdit(item)} />
                                <Button title="Cancel Issue" variant="danger" size="sm" style={styles.half} onPress={() => openReqDelete(item)} />
                            </View>
                        )}
                    </Card>
                ))}
                {filtered.length === 0 && !loading && (
                    <View style={styles.empty}><Ionicons name="build-outline" size={54} color={colors.outlineVariant} /><Text style={styles.emptyText}>No maintenance requests</Text></View>
                )}
                <Button title="Report an Issue" onPress={openCreate} style={{ marginTop: spacing.md }} icon={<Ionicons name="add" size={18} color={colors.onPrimary} />} />
            </ScrollView>

            {/* CREATE / DIRECT EDIT MODAL */}
            <Modal visible={createModal} transparent animationType="slide" onRequestClose={() => setCreateModal(false)}>
                <View style={styles.overlay}>
                    <ScrollView style={[styles.modal, { paddingBottom: Platform.OS === 'android' ? 150 : 40 }]} keyboardShouldPersistTaps="handled">
                        <Text style={styles.modalTitle}>{editingMaint ? 'Edit Maintenance Request' : 'Report Maintenance Issue'}</Text>

                        {/* Property Picker */}
                        <Text style={styles.subLabel}>Property *</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                                {activeProperties.length === 0 && <Text style={{ ...typography.bodySm, color: colors.error }}>No active leases available.</Text>}
                                {activeProperties.map(p => (
                                    <TouchableOpacity key={p._id}
                                        style={[styles.pChip, form.property === p._id && { borderColor: colors.primary, backgroundColor: colors.primaryFixed + '33' }]}
                                        onPress={() => !editingMaint && setForm(pr => ({ ...pr, property: p._id }))}>
                                        <Text style={[styles.pText, form.property === p._id && { color: colors.primary }]}>{p.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <View style={{ marginBottom: spacing.sm }}>
                            <Input label="Issue Title *" placeholder="e.g. Leaking roof in bedroom" value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v.slice(0, MAX_TITLE) }))} maxLength={MAX_TITLE} />
                            <Text style={styles.charCounter}>{form.title.length}/{MAX_TITLE}</Text>
                        </View>
                        <View style={{ marginBottom: spacing.sm }}>
                            <Input label="Description *" placeholder="Describe the issue in detail..." value={form.description} onChangeText={v => setForm(p => ({ ...p, description: v.slice(0, MAX_DESC) }))} multiline numberOfLines={3} maxLength={MAX_DESC} />
                            <Text style={styles.charCounter}>{form.description.length}/{MAX_DESC}</Text>
                        </View>

                        <Text style={styles.subLabel}>Priority</Text>
                        <View style={styles.priorityRow}>
                            {PRIORITIES.map(p => (
                                <TouchableOpacity key={p} style={[styles.pChip, form.priority === p && { borderColor: PRIORITY_COLORS[p], backgroundColor: PRIORITY_COLORS[p] + '22' }]} onPress={() => setForm(pr => ({ ...pr, priority: p }))}>
                                    <Text style={[styles.pText, form.priority === p && { color: PRIORITY_COLORS[p] }]}>{p.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.subLabel}>Photos * {images.length > 0 && `(${images.length}/${MAX_IMAGES})`}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                {images.map((img, i) => (
                                    <View key={i} style={styles.photoBox}>
                                        <Text style={{ fontSize: 10, color: colors.primary }}>Photo {i + 1}</Text>
                                        <TouchableOpacity style={styles.photoClose} onPress={() => removeImage(i, images, setImages)}>
                                            <Ionicons name="close-circle" size={20} color={colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                {images.length < MAX_IMAGES && (
                                    <TouchableOpacity style={styles.imgAddBtn} onPress={() => pickImage(images, setImages)}>
                                        <Ionicons name="camera-outline" size={20} color={colors.primary} />
                                        <Text style={styles.imgAddText}>Add Photo</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </ScrollView>

                        {editingMaint?.images?.length > 0 && images.length === 0 && (
                            <View style={{ marginBottom: spacing.sm, padding: spacing.sm, backgroundColor: colors.surfaceContainerLowest, borderRadius: 8 }}>
                                <Text style={styles.subLabel}>Current Uploaded Photos (Will be kept)</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                                    {editingMaint.images.map((img, i) => (
                                        <TouchableOpacity key={i} onPress={() => { import('react-native').then(m => m.Linking.openURL(`${BASE_URL}${img}`)) }}>
                                            <Text style={{ ...typography.bodySm, color: colors.primary, textDecorationLine: 'underline' }}>View Photo {i + 1}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                        {editingMaint && images.length === 0 && <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.sm }}>Saving without new photos keeps existing photos.</Text>}

                        <View style={styles.btnRow}>
                            <Button title="Cancel" variant="ghost" style={styles.half} onPress={() => setCreateModal(false)} />
                            <Button title={editingMaint ? "Save Changes" : "Submit"} style={styles.half} loading={saving} onPress={handleSave} />
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* REQUEST EDIT MODAL */}
            <Modal visible={!!reqEditModal} transparent animationType="slide" onRequestClose={() => setReqEditModal(null)}>
                <View style={styles.overlay}>
                    <ScrollView style={[styles.modal, { paddingBottom: Platform.OS === 'android' ? 150 : 40 }]} keyboardShouldPersistTaps="handled">
                        <Text style={styles.modalTitle}>Request Edit</Text>
                        <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.md }}>
                            Owner must approve these changes.
                        </Text>

                        <View style={{ marginBottom: spacing.sm }}>
                            <Input label="Issue Title" value={reqEditForm.title} onChangeText={v => setReqEditForm(p => ({ ...p, title: v.slice(0, MAX_TITLE) }))} maxLength={MAX_TITLE} />
                            <Text style={styles.charCounter}>{reqEditForm.title.length}/{MAX_TITLE}</Text>
                        </View>
                        <View style={{ marginBottom: spacing.sm }}>
                            <Input label="Description" value={reqEditForm.description} onChangeText={v => setReqEditForm(p => ({ ...p, description: v.slice(0, MAX_DESC) }))} multiline numberOfLines={3} maxLength={MAX_DESC} />
                            <Text style={styles.charCounter}>{reqEditForm.description.length}/{MAX_DESC}</Text>
                        </View>

                        <Text style={styles.subLabel}>Priority</Text>
                        <View style={styles.priorityRow}>
                            {PRIORITIES.map(p => (
                                <TouchableOpacity key={p} style={[styles.pChip, reqEditForm.priority === p && { borderColor: PRIORITY_COLORS[p], backgroundColor: PRIORITY_COLORS[p] + '22' }]} onPress={() => setReqEditForm(pr => ({ ...pr, priority: p }))}>
                                    <Text style={[styles.pText, reqEditForm.priority === p && { color: PRIORITY_COLORS[p] }]}>{p.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.subLabel}>Replace Photos {reqEditImages.length > 0 && `(${reqEditImages.length}/${MAX_IMAGES})`}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                {reqEditImages.map((img, i) => (
                                    <View key={i} style={styles.photoBox}>
                                        <Text style={{ fontSize: 10, color: colors.primary }}>Photo {i + 1}</Text>
                                        <TouchableOpacity style={styles.photoClose} onPress={() => removeImage(i, reqEditImages, setReqEditImages)}>
                                            <Ionicons name="close-circle" size={20} color={colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                {reqEditImages.length < MAX_IMAGES && (
                                    <TouchableOpacity style={styles.imgAddBtn} onPress={() => pickImage(reqEditImages, setReqEditImages)}>
                                        <Ionicons name="camera-outline" size={20} color={colors.primary} />
                                        <Text style={styles.imgAddText}>Select New</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </ScrollView>

                        {reqEditModal?.images?.length > 0 && reqEditImages.length === 0 && (
                            <View style={{ marginBottom: spacing.sm, padding: spacing.sm, backgroundColor: colors.surfaceContainerLowest, borderRadius: 8 }}>
                                <Text style={styles.subLabel}>Current Uploaded Photos (Will be kept)</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                                    {reqEditModal.images.map((img, i) => (
                                        <TouchableOpacity key={i} onPress={() => { import('react-native').then(m => m.Linking.openURL(`${BASE_URL}${img}`)) }}>
                                            <Text style={{ ...typography.bodySm, color: colors.primary, textDecorationLine: 'underline' }}>View Photo {i + 1}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                        {reqEditImages.length === 0 && <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.sm }}>Leaving empty keeps existing property photos.</Text>}

                        <View style={styles.btnRow}>
                            <Button title="Cancel" variant="ghost" style={styles.half} onPress={() => setReqEditModal(null)} />
                            <Button title="Send Request" style={styles.half} loading={reqEditing} onPress={handleReqEdit} />
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* REQUEST DELETE MODAL */}
            <Modal visible={!!reqDeleteModal} transparent animationType="slide" onRequestClose={() => setReqDeleteModal(null)}>
                <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Cancel Request</Text>
                        <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.md }}>
                            Owner must approve cancellation of active maintenance issues. Please provide a reason.
                        </Text>
                        <TextInput
                            style={styles.reasonInput}
                            placeholder="Reason for cancellation..."
                            placeholderTextColor={colors.outline}
                            value={reqDeleteReason}
                            onChangeText={setReqDeleteReason}
                            multiline numberOfLines={3}
                        />
                        <View style={styles.btnRow}>
                            <Button title="Close" variant="ghost" style={styles.half} onPress={() => setReqDeleteModal(null)} />
                            <Button title="Send Request" variant="danger" style={styles.half} loading={reqDeleting}
                                onPress={() => { if (!reqDeleteReason.trim()) { Alert.alert('Error', 'Reason required'); return; } handleReqDelete(); }} />
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

    reqBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: '#fff3e0', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, marginTop: spacing.xs, alignSelf: 'flex-start' },
    reqBannerText: { ...typography.labelMd, color: '#e65100' },

    rejBox: { backgroundColor: colors.errorContainer, borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm },
    rejText: { ...typography.bodySm, color: colors.onErrorContainer },
    actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },

    empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, maxHeight: '90%' },
    modalTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.md },
    subLabel: { ...typography.labelMd, color: colors.onSurfaceVariant, marginBottom: spacing.xs },
    priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    pChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: colors.outlineVariant },
    pText: { ...typography.labelMd, color: colors.onSurfaceVariant },

    photoBox: { width: 70, height: 70, backgroundColor: colors.primaryContainer, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
    photoClose: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 99 },
    imgAddBtn: { width: 70, height: 70, borderRadius: 8, borderWidth: 1.5, borderColor: colors.outlineVariant, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
    imgAddText: { ...typography.labelMd, color: colors.primary, marginTop: 4, fontSize: 10 },

    charCounter: { ...typography.labelMd, color: colors.onSurfaceVariant, textAlign: 'right', marginTop: -spacing.sm },
    reasonInput: { backgroundColor: colors.surfaceContainer, borderRadius: 12, padding: spacing.md, ...typography.bodyMd, color: colors.onSurface, textAlignVertical: 'top', height: 80, marginBottom: spacing.sm },

    btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    half: { flex: 1 },
});
