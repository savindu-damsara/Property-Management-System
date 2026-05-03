import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Modal, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { appointmentsAPI } from '../../services/api';
import ScreenHeader from '../../components/ScreenHeader';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { colors, typography, spacing } from '../../constants/theme';

export default function ScheduleAppointmentScreen({ navigation, route }) {
    const { property } = route.params || {};
    const [form, setForm] = useState({ location: '' });
    const [nicFront, setNicFront] = useState(null);
    const [nicBack, setNicBack] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const [appointmentDate, setAppointmentDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const onDateChange = (event, selectedDate) => {
        if (Platform.OS !== 'ios') setShowDatePicker(false);
        if (selectedDate) {
            setAppointmentDate(prev => {
                const newDate = new Date(prev);
                newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                return newDate;
            });
        }
    };

    const onTimeChange = (event, selectedTime) => {
        if (Platform.OS !== 'ios') setShowTimePicker(false);
        if (selectedTime) {
            setAppointmentDate(prev => {
                const newDate = new Date(prev);
                newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
                return newDate;
            });
        }
    };

    const pickNic = async (side) => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission', 'Gallery access required'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });
        if (!result.canceled && result.assets?.[0]) {
            if (side === 'front') setNicFront(result.assets[0]);
            else setNicBack(result.assets[0]);
        }
    };

    const validate = () => {
        const e = {};
        if (appointmentDate < new Date()) {
            Alert.alert('Invalid Date/Time', 'You cannot schedule an appointment in the past.');
            return false;
        }
        if (!form.location.trim()) e.location = 'Location required';
        if (!nicFront || !nicBack) {
            Alert.alert('Missing NIC', 'Both Front and Back photos of your NIC are required.');
            return false;
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('property', property._id);
            fd.append('date', appointmentDate.toISOString());

            const hours = appointmentDate.getHours().toString().padStart(2, '0');
            const minutes = appointmentDate.getMinutes().toString().padStart(2, '0');
            fd.append('time', `${hours}:${minutes}`);

            fd.append('location', form.location);
            fd.append('nicFront', { uri: nicFront.uri, type: 'image/jpeg', name: 'nic_front.jpg' });
            fd.append('nicBack', { uri: nicBack.uri, type: 'image/jpeg', name: 'nic_back.jpg' });

            await appointmentsAPI.create(fd);
            Alert.alert('Success!', 'Your appointment request has been sent to the property owner.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to schedule appointment');
        } finally {
            setLoading(false);
        }
    };

    const renderDateTimePicker = () => {
        if (Platform.OS === 'ios') {
            return (
                <Modal visible={showDatePicker || showTimePicker} transparent animationType="slide">
                    <TouchableOpacity style={styles.modalOverlay} onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }} activeOpacity={1}>
                        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                            {showDatePicker && (
                                <DateTimePicker value={appointmentDate} mode="date" display="spinner" themeVariant="light" textColor="#000000" minimumDate={new Date()} onChange={onDateChange} style={{ height: 200, width: '100%', backgroundColor: 'transparent' }} />
                            )}
                            {showTimePicker && (
                                <DateTimePicker value={appointmentDate} mode="time" display="spinner" themeVariant="light" textColor="#000000" minimumDate={new Date()} onChange={onTimeChange} style={{ height: 200, width: '100%', backgroundColor: 'transparent' }} />
                            )}
                            <Button title="Done" onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }} />
                        </View>
                    </TouchableOpacity>
                </Modal>
            );
        }
        return (
            <>
                {showDatePicker && <DateTimePicker value={appointmentDate} mode="date" display="default" minimumDate={new Date()} onChange={({ type }, d) => { setShowDatePicker(false); if (type === 'set' && d) onDateChange(null, d); }} />}
                {showTimePicker && <DateTimePicker value={appointmentDate} mode="time" display="default" minimumDate={new Date()} onChange={({ type }, d) => { setShowTimePicker(false); if (type === 'set' && d) onTimeChange(null, d); }} />}
            </>
        );
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScreenHeader title="Schedule Appointment" subtitle={property?.title} onBack={() => navigation.goBack()} />
            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'android' ? 150 : 40 }]} keyboardShouldPersistTaps="handled">
                <Card style={styles.noticeCard} variant="filled">
                    <View style={styles.noticeRow}>
                        <Ionicons name="call" size={20} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.noticeTitle}>Before Scheduling</Text>
                            <Text style={styles.noticeText}>
                                Please call the property owner <Text style={{ fontWeight: '700' }}>{property?.owner?.name}</Text> at{' '}
                                <Text style={{ color: colors.primary }}>{property?.owner?.phone || '(no phone listed)'}</Text> to confirm a date, time and location.
                            </Text>
                        </View>
                    </View>
                </Card>

                <Text style={styles.section}>Appointment Details</Text>

                <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                    <View pointerEvents="none">
                        <Input label="Date*" placeholder="Select date" value={appointmentDate.toLocaleDateString()}
                            icon={<Ionicons name="calendar-outline" size={20} color={colors.outline} />} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowTimePicker(true)} activeOpacity={0.8}>
                    <View pointerEvents="none">
                        <Input label="Time*" placeholder="Select time" value={`${appointmentDate.getHours().toString().padStart(2, '0')}:${appointmentDate.getMinutes().toString().padStart(2, '0')}`}
                            icon={<Ionicons name="time-outline" size={20} color={colors.outline} />} />
                    </View>
                </TouchableOpacity>

                {renderDateTimePicker()}

                <Input label={`Location / Meeting Point* (${form.location.length}/50)`} placeholder="e.g. Property lobby, main entrance" value={form.location} onChangeText={v => setField('location', v)} error={errors.location} maxLength={50}
                    icon={<Ionicons name="location-outline" size={20} color={colors.outline} />} />

                <Text style={styles.section}>NIC Verification (Required)*</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <TouchableOpacity style={[styles.uploadBox, { flex: 1 }]} onPress={() => pickNic('front')} activeOpacity={0.8}>
                        {nicFront ? (
                            <Image source={{ uri: nicFront.uri }} style={styles.nicImg} />
                        ) : (
                            <View style={styles.uploadPlaceholder}>
                                <Ionicons name="id-card-outline" size={28} color={colors.primary} />
                                <Text style={styles.uploadText}>Front Side</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.uploadBox, { flex: 1 }]} onPress={() => pickNic('back')} activeOpacity={0.8}>
                        {nicBack ? (
                            <Image source={{ uri: nicBack.uri }} style={styles.nicImg} />
                        ) : (
                            <View style={styles.uploadPlaceholder}>
                                <Ionicons name="card-outline" size={28} color={colors.primary} />
                                <Text style={styles.uploadText}>Back Side</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <Button
                    title="Send Appointment Request"
                    onPress={handleSubmit}
                    loading={loading}
                    size="lg"
                    style={{ marginTop: spacing.xl }}
                    icon={<Ionicons name="send" size={18} color={colors.onPrimary} />}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scroll: { padding: spacing.margin, paddingBottom: 60, backgroundColor: colors.background },
    section: { ...typography.h3, color: colors.onSurface, marginTop: spacing.lg, marginBottom: spacing.sm },
    noticeCard: { marginBottom: spacing.sm },
    noticeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    noticeTitle: { ...typography.labelMd, color: colors.onSurface, marginBottom: 4 },
    noticeText: { ...typography.bodySm, color: colors.onSurface, lineHeight: 20 },
    uploadBox: { height: 120, borderRadius: 12, borderWidth: 2, borderColor: colors.outlineVariant, borderStyle: 'dashed', overflow: 'hidden' },
    uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainerLowest },
    nicImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    uploadText: { ...typography.bodySm, color: colors.primary, marginTop: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.surfaceContainerLowest, padding: spacing.xl, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
});
