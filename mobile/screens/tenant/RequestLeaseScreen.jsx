import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { leasesAPI } from '../../services/api';
import ScreenHeader from '../../components/ScreenHeader';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { colors, typography, spacing } from '../../constants/theme';

export default function RequestLeaseScreen({ navigation, route }) {
    const { property, editLease, isUpdateRequest } = route.params || {};
    const [form, setForm] = useState({
        terms: editLease?.terms || '',
        rentAmount: editLease?.rentAmount?.toString() || property?.rentPerMonth?.toString() || ''
    });
    const [rentDueDay, setRentDueDay] = useState(editLease?.rentDueDay || null);

    // Map existing documents into initial state visually natively
    const initialDocs = (editLease?.documents || []).map((url, idx) => ({ uri: url, name: `existing_document_${idx + 1}.pdf`, isExisting: true }));
    const [documents, setDocuments] = useState(initialDocs);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Dates
    const [startDate, setStartDate] = useState(editLease?.startDate ? new Date(editLease.startDate) : new Date());
    const [endDate, setEndDate] = useState(editLease?.endDate ? new Date(editLease.endDate) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)));
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const onStartChange = (event, selectedDate) => {
        if (Platform.OS !== 'ios') setShowStartPicker(false);
        if (selectedDate) setStartDate(selectedDate);
    };

    const onEndChange = (event, selectedDate) => {
        if (Platform.OS !== 'ios') setShowEndPicker(false);
        if (selectedDate) setEndDate(selectedDate);
    };

    const pickDocument = async () => {
        const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], multiple: true });
        if (!result.canceled && result.assets) {
            let totalSize = documents.reduce((acc, doc) => acc + (doc.size || 0), 0);
            const validDocs = [];
            for (const asset of result.assets) {
                if (totalSize + (asset.size || 0) > 100 * 1024 * 1024) {
                    Alert.alert('Size Limit Exceeded', 'Total upload size cannot exceed 100MB.');
                    break;
                }
                totalSize += (asset.size || 0);
                validDocs.push(asset);
            }
            setDocuments(prev => [...prev, ...validDocs]);
        }
    };

    const validate = () => {
        const e = {};
        if (!form.rentAmount.trim() || isNaN(form.rentAmount)) e.rentAmount = 'Valid monthly rent required';
        if (endDate <= startDate) e.date = 'End date must be after start date';
        if (!rentDueDay) e.rentDueDay = 'Please select a rent due day';
        if (form.terms.length > 500) e.terms = 'Terms must not exceed 500 characters';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            if (errors.date) Alert.alert('Invalid Dates', errors.date);
            if (errors.rentDueDay) Alert.alert('Due Day Required', 'Please select a rent due day (1–28).');
            return;
        }
        setLoading(true);
        try {
            const fd = new FormData();
            if (!editLease && property?._id) fd.append('property', property._id);
            fd.append('startDate', startDate.toISOString());
            fd.append('endDate', endDate.toISOString());
            fd.append('rentAmount', form.rentAmount);
            fd.append('terms', form.terms);
            fd.append('rentDueDay', String(rentDueDay));

            documents.forEach((doc, idx) => {
                if (!doc.isExisting) {
                    fd.append('documents', { uri: doc.uri, type: doc.mimeType || 'application/pdf', name: doc.name || `document_${idx}.pdf` });
                }
            });

            if (isUpdateRequest) {
                // Active lease — send as a formal update request (needs owner approval)
                const keptExisting = documents.filter(d => d.isExisting).map(d => d.uri);
                keptExisting.forEach(url => fd.append('existingDocuments', url));
                await leasesAPI.update(editLease._id, fd);
                Alert.alert('Update Requested!', 'Your update request has been sent to the property owner for approval.', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            } else if (editLease) {
                // Pending lease — direct edit (no approval needed)
                const keptExisting = documents.filter(d => d.isExisting).map(d => d.uri);
                keptExisting.forEach(url => fd.append('existingDocuments', url));
                await leasesAPI.editDirectly(editLease._id, fd);
                Alert.alert('Lease Updated!', 'Your pending lease proposal has been updated successfully.', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            } else {
                // New lease request
                await leasesAPI.create(fd);
                Alert.alert('Lease Requested!', 'Your lease proposal has been sent to the property owner for review.', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            }
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to submit lease request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background, height: Platform.OS === 'web' ? '100vh' : '100%' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScreenHeader
                title={isUpdateRequest ? 'Request Lease Update' : editLease ? 'Edit Pending Lease' : 'Request Lease'}
                subtitle={property?.title || editLease?.property?.title}
                onBack={() => navigation.goBack()}
            />
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Card style={styles.noticeCard} variant="filled">
                    <View style={styles.noticeRow}>
                        <Ionicons name="document-text" size={20} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.noticeTitle}>
                                {isUpdateRequest ? 'Update Request' : editLease ? 'Edit Proposal' : 'Lease Proposal'}
                            </Text>
                            <Text style={styles.noticeText}>
                                {isUpdateRequest
                                    ? 'Propose changes to your active lease. The owner will review and approve or reject the update.'
                                    : editLease
                                        ? 'You can modify your unapproved lease proposal. Changes take effect immediately.'
                                        : 'Submit your preferred lease terms. The property owner will review these terms. Once accepted, this acts as your formal agreement framework.'}
                            </Text>
                        </View>
                    </View>
                </Card>

                <Text style={styles.section}>Lease Duration</Text>

                <TouchableOpacity onPress={() => setShowStartPicker(true)} activeOpacity={0.8}>
                    <View pointerEvents="none">
                        <Input label="Proposed Start Date*" value={startDate.toLocaleDateString()}
                            icon={<Ionicons name="calendar-outline" size={20} color={colors.outline} />} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowEndPicker(true)} activeOpacity={0.8}>
                    <View pointerEvents="none">
                        <Input label="Proposed End Date*" value={endDate.toLocaleDateString()}
                            icon={<Ionicons name="calendar-outline" size={20} color={colors.outline} />} error={errors.date} />
                    </View>
                </TouchableOpacity>

                {Platform.OS === 'ios' ? (
                    <Modal visible={showStartPicker || showEndPicker} transparent animationType="slide">
                        <TouchableOpacity style={styles.modalOverlay} onPress={() => { setShowStartPicker(false); setShowEndPicker(false); }} activeOpacity={1}>
                            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                                {showStartPicker && (
                                    <DateTimePicker value={startDate} mode="date" display="spinner" themeVariant="light" textColor="#000000" minimumDate={new Date()} onChange={onStartChange} style={{ height: 200, width: '100%', backgroundColor: 'transparent' }} />
                                )}
                                {showEndPicker && (
                                    <DateTimePicker value={endDate} mode="date" display="spinner" themeVariant="light" textColor="#000000" minimumDate={startDate} onChange={onEndChange} style={{ height: 200, width: '100%', backgroundColor: 'transparent' }} />
                                )}
                                <Button title="Done" onPress={() => { setShowStartPicker(false); setShowEndPicker(false); }} />
                            </View>
                        </TouchableOpacity>
                    </Modal>
                ) : (
                    <>
                        {showStartPicker && <DateTimePicker value={startDate} mode="date" display="default" minimumDate={new Date()} onChange={onStartChange} />}
                        {showEndPicker && <DateTimePicker value={endDate} mode="date" display="default" minimumDate={startDate} onChange={onEndChange} />}
                    </>
                )}

                <Text style={styles.section}>Agreement Terms</Text>
                <Input label="Agreed Monthly Rent (LKR)*" placeholder="e.g. 50000" value={form.rentAmount} onChangeText={v => setField('rentAmount', v)} keyboardType="numeric" error={errors.rentAmount}
                    icon={<Ionicons name="cash-outline" size={20} color={colors.outline} />} />

                <Input label="Proposed Terms & Conditions" placeholder="e.g. Include water bill in rent, specific maintenance requests..." value={form.terms} onChangeText={v => setField('terms', v)} multiline numberOfLines={4} error={errors.terms} />
                <Text style={{ ...typography.bodySm, color: form.terms.length > 500 ? colors.error : colors.outline, textAlign: 'right', marginTop: -4 }}>Characters: {form.terms.length} / 500</Text>

                <Text style={styles.section}>Rent Due Day *</Text>
                <Text style={{ ...typography.bodySm, color: errors.rentDueDay ? colors.error : colors.onSurfaceVariant, marginBottom: spacing.sm }}>
                    {errors.rentDueDay || 'Day of each month rent must be paid by (1–28).'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                    <View style={{ flexDirection: 'row', gap: 8, borderWidth: errors.rentDueDay ? 1.5 : 0, borderColor: colors.error, borderRadius: 12, padding: errors.rentDueDay ? 6 : 0 }}>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                            <TouchableOpacity
                                key={day}
                                onPress={() => { setRentDueDay(day); setErrors(p => ({ ...p, rentDueDay: undefined })); }}
                                style={[styles.dayChip, rentDueDay === day && styles.dayChipActive]}
                            >
                                <Text style={[styles.dayChipText, rentDueDay === day && styles.dayChipTextActive]}>{day}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                <Text style={styles.section}>Supporting Documents (Multi-Upload)</Text>
                <TouchableOpacity style={styles.uploadArea} onPress={pickDocument} activeOpacity={0.8}>
                    <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
                    <Text style={styles.uploadText}>Select Files</Text>
                    <Text style={styles.uploadSub}>PDF, JPEG, PNG (Max 100MB)</Text>
                </TouchableOpacity>

                {documents.length > 0 && (
                    <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
                        {documents.map((doc, idx) => (
                            <View key={idx} style={styles.docRow}>
                                <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
                                <Text style={styles.docText} numberOfLines={1}>{doc.name}</Text>
                                <TouchableOpacity onPress={() => setDocuments(p => p.filter((_, i) => i !== idx))}>
                                    <Ionicons name="close-circle" size={24} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                <Button
                    title={isUpdateRequest ? 'Submit Update Request' : editLease ? 'Save Changes' : 'Submit Lease Proposal'}
                    onPress={handleSubmit}
                    loading={loading}
                    size="lg"
                    style={{ marginTop: spacing.xl }}
                    icon={<Ionicons name={isUpdateRequest ? 'send' : editLease ? 'save' : 'send'} size={18} color={colors.onPrimary} />}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scroll: { padding: spacing.margin, paddingBottom: 60 },
    section: { ...typography.h3, color: colors.onSurface, marginTop: spacing.lg, marginBottom: spacing.sm },
    noticeCard: { marginBottom: spacing.sm },
    noticeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    noticeTitle: { ...typography.labelMd, color: colors.onSurface, marginBottom: 4 },
    noticeText: { ...typography.bodySm, color: colors.onSurface, lineHeight: 20 },
    uploadArea: {
        borderWidth: 2, borderColor: colors.outlineVariant, borderStyle: 'dashed',
        borderRadius: 12, alignItems: 'center', padding: spacing.xl, gap: spacing.xs,
    },
    uploadText: { ...typography.bodyMd, color: colors.primary, textAlign: 'center' },
    uploadSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.surfaceContainerLowest, padding: spacing.xl, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
    docRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLow, padding: spacing.sm, borderRadius: 8, gap: 8 },
    docText: { ...typography.bodySm, color: colors.onSurface, flex: 1 },
    dayChip: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center' },
    dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    dayChipText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    dayChipTextActive: { color: colors.onPrimary },
});
