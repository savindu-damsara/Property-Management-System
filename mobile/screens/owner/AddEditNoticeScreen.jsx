import React, { useState, useEffect, useCallback } from 'react';
import {
    View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert, Text
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { noticesAPI, leasesAPI } from '../../services/api';
import ScreenHeader from '../../components/ScreenHeader';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors, spacing, typography } from '../../constants/theme';
import { useFocusEffect } from '@react-navigation/native';

const MAX_TITLE = 30;
const MAX_DESC = 100;
const MAX_DOCS = 5;

export default function AddEditNoticeScreen({ navigation, route }) {
    const editing = route?.params?.notice;
    const [form, setForm] = useState({
        title: editing?.title || '',
        content: editing?.content || '',
        targetAll: editing ? editing.targetAll : true,
        targetProperties: editing ? editing.targetProperties?.map(p => p._id || p) || [] : []
    });

    // docs can be a mix of URLs (strings from backend if editing) or local DocumentPicker assets
    const [docs, setDocs] = useState([]);
    const [saving, setSaving] = useState(false);

    const [properties, setProperties] = useState([]);

    const loadProperties = useCallback(async () => {
        try {
            const { data } = await leasesAPI.getAll();
            const activePropMap = {};
            (data || []).forEach(l => {
                if (l.status === 'active' && l.property) activePropMap[l.property._id] = l.property;
            });
            setProperties(Object.values(activePropMap));
        } catch (err) { }
    }, []);

    useFocusEffect(useCallback(() => {
        loadProperties();
    }, [loadProperties]));

    const pickDocs = async () => {
        if (docs.length >= MAX_DOCS) {
            Alert.alert('Limit Reached', `You can only attach up to ${MAX_DOCS} files.`);
            return;
        }
        const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true });
        if (!r.canceled && r.assets) {
            const newAssets = r.assets.slice(0, MAX_DOCS - docs.length);
            setDocs([...docs, ...newAssets]);
        }
    };

    const removeDoc = (idx) => {
        const n = [...docs];
        n.splice(idx, 1);
        setDocs(n);
    };

    const toggleProperty = (id) => {
        if (form.targetProperties.includes(id)) {
            setForm(prev => ({ ...prev, targetProperties: prev.targetProperties.filter(pid => pid !== id) }));
        } else {
            setForm(prev => ({ ...prev, targetProperties: [...prev.targetProperties, id] }));
        }
    };

    const handleSave = async () => {
        if (!form.title.trim() || !form.content.trim()) { Alert.alert('Info', 'Title and content are required'); return; }
        if (!form.targetAll && form.targetProperties.length === 0) { Alert.alert('Info', 'Please select at least one target property or select All Properties.'); return; }

        if (!editing && docs.length === 0) {
            Alert.alert('Required', 'At least one attachment (image or PDF) is required.');
            return;
        }

        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('title', form.title.trim().slice(0, MAX_TITLE));
            fd.append('content', form.content.trim().slice(0, MAX_DESC));
            fd.append('targetAll', form.targetAll);

            if (!form.targetAll) {
                form.targetProperties.forEach(pid => {
                    fd.append('targetProperties', pid);
                });
            }

            // Only append new files objects. Backend logic says if empty and keepOldDocuments=true, keeps old. 
            // Since we do not show/manage existing backend documents cleanly in state (strings vs objects), 
            // if we edit and pick NO new docs, we do `keepOldDocuments = true`.
            // Wait, editing in this app is tricky with mixed states. 
            // The prompt says "if req.files exists... else keepOldDocuments".
            // So if `docs` has newly picked files, we append them, replacing the backend files.
            // If we don't pick new ones, we just keep the previous.

            let hasNew = false;
            docs.forEach((doc, i) => {
                hasNew = true;
                fd.append('documents', { uri: doc.uri, type: doc.mimeType || 'application/octet-stream', name: doc.name || `doc-${i}` });
            });

            if (!hasNew && editing) {
                fd.append('keepOldDocuments', 'true');
            }

            if (editing) { await noticesAPI.update(editing._id, fd); } else { await noticesAPI.create(fd); }
            navigation.goBack();
            Alert.alert('Success', editing ? 'Notice updated!' : 'Notice posted!');
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to save notice');
        } finally { setSaving(false); }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScreenHeader title={editing ? 'Edit Notice' : 'New Notice'} onBack={() => navigation.goBack()} />
            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'android' ? 150 : 40 }]} keyboardShouldPersistTaps="handled">

                <Text style={styles.sectionLabel}>Target Properties *</Text>
                <View style={styles.targetRow}>
                    <TouchableOpacity style={[styles.targetBtn, form.targetAll && styles.targetBtnActive]} onPress={() => setForm(p => ({ ...p, targetAll: true }))}>
                        <Text style={[styles.targetText, form.targetAll && styles.targetTextActive]}>All Active Properties</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.targetBtn, !form.targetAll && styles.targetBtnActive]} onPress={() => setForm(p => ({ ...p, targetAll: false }))}>
                        <Text style={[styles.targetText, !form.targetAll && styles.targetTextActive]}>Specific Properties</Text>
                    </TouchableOpacity>
                </View>

                {!form.targetAll && (
                    <View style={styles.propList}>
                        {properties.length === 0 && <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant }}>No properties found.</Text>}
                        {properties.map(p => (
                            <TouchableOpacity key={p._id} style={[styles.pChip, form.targetProperties.includes(p._id) && styles.pChipActive]} onPress={() => toggleProperty(p._id)}>
                                <Text style={[styles.pText, form.targetProperties.includes(p._id) && styles.pTextActive]}>{p.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
                    <Input label="Notice Title *" placeholder="e.g. Water Supply Interruption" value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v.slice(0, MAX_TITLE) }))} icon={<Ionicons name="megaphone-outline" size={20} color={colors.outline} />} maxLength={MAX_TITLE} />
                    <Text style={styles.charCounter}>{form.title.length}/{MAX_TITLE}</Text>
                </View>

                <View style={{ marginBottom: spacing.sm }}>
                    <Input label="Content *" placeholder="Write your announcement here..." value={form.content} onChangeText={v => setForm(p => ({ ...p, content: v.slice(0, MAX_DESC) }))} multiline numberOfLines={4} maxLength={MAX_DESC} />
                    <Text style={styles.charCounter}>{form.content.length}/{MAX_DESC}</Text>
                </View>

                <Text style={styles.sectionLabel}>Attachments *</Text>
                <Text style={{ ...typography.labelMd, color: colors.onSurfaceVariant, marginBottom: spacing.xs }}>You can upload up to {MAX_DOCS} PDFs or images (max 50MB each). At least 1 is required.</Text>

                {editing && docs.length === 0 && (
                    <Text style={{ ...typography.bodySm, color: colors.primary, marginBottom: spacing.xs }}>Note: Leaving this empty keeps the previous attachments.</Text>
                )}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                    {docs.map((doc, idx) => (
                        <View key={idx} style={styles.docBox}>
                            <Ionicons name="document-text" size={24} color={colors.primary} />
                            <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                            <TouchableOpacity style={styles.docClose} onPress={() => removeDoc(idx)}>
                                <Ionicons name="close-circle" size={20} color={colors.error} />
                            </TouchableOpacity>
                        </View>
                    ))}
                    {docs.length < MAX_DOCS && (
                        <TouchableOpacity style={styles.docAddBtn} onPress={pickDocs} activeOpacity={0.8}>
                            <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                            <Text style={styles.docAddText}>Add File</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Button title={editing ? 'Update Notice' : 'Post Notice'} onPress={handleSave} loading={saving} size="lg" style={{ marginTop: spacing.xl }} icon={<Ionicons name="send" size={18} color={colors.onPrimary} />} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scroll: { padding: spacing.margin, paddingBottom: 60, backgroundColor: colors.background },
    sectionLabel: { ...typography.h3, fontSize: 16, color: colors.onSurface, marginBottom: spacing.sm, marginTop: spacing.md },
    targetRow: { flexDirection: 'row', gap: spacing.sm },
    targetBtn: { flex: 1, paddingVertical: spacing.md, borderWidth: 1.5, borderColor: colors.outlineVariant, borderRadius: 12, alignItems: 'center' },
    targetBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryContainer },
    targetText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    targetTextActive: { color: colors.onPrimaryContainer },
    propList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceContainerLowest, borderRadius: 12, borderWidth: 1, borderColor: colors.outlineVariant },
    pChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: colors.outlineVariant },
    pChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryFixed + '44' },
    pText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    pTextActive: { color: colors.primary },
    charCounter: { ...typography.labelMd, color: colors.onSurfaceVariant, textAlign: 'right', marginTop: -spacing.sm },

    docBox: { width: 100, height: 100, backgroundColor: colors.primaryContainer, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, padding: spacing.xs },
    docClose: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 99 },
    docName: { ...typography.labelMd, fontSize: 10, color: colors.onPrimaryContainer, marginTop: 4, textAlign: 'center' },
    docAddBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: colors.outlineVariant, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
    docAddText: { ...typography.labelMd, color: colors.primary, marginTop: 4, fontSize: 10 },
});
