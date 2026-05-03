import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, RefreshControl, Platform,
    KeyboardAvoidingView, Linking
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { appointmentsAPI, authAPI, BASE_URL } from '../../services/api';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors, typography, spacing } from '../../constants/theme';

export default function AppointmentsTenantScreen() {
    const insets = useSafeAreaInsets();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [changeModal, setChangeModal] = useState(null);
    const [changeForm, setChangeForm] = useState({ location: '' });
    const [changeDate, setChangeDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [cancelModal, setCancelModal] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [filter, setFilter] = useState('all');

    const load = useCallback(async () => {
        try {
            const { data } = await appointmentsAPI.getAll();
            setAppointments(data || []);
        } catch (err) { console.log(err?.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useFocusEffect(useCallback(() => {
        load();
        authAPI.clearNotification('appointments').catch(() => { });
    }, [load]));

    useEffect(() => { load(); }, [load]);

    const onDateChange = (event, selectedDate) => {
        if (Platform.OS !== 'ios') setShowDatePicker(false);
        if (selectedDate) {
            setChangeDate(prev => {
                const newDate = new Date(prev);
                newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                return newDate;
            });
        }
    };

    const onTimeChange = (event, selectedTime) => {
        if (Platform.OS !== 'ios') setShowTimePicker(false);
        if (selectedTime) {
            setChangeDate(prev => {
                const newDate = new Date(prev);
                newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
                return newDate;
            });
        }
    };

    const handleChangeRequest = async () => {
        const { location } = changeForm;
        if (changeDate < new Date()) {
            Alert.alert('Invalid Date', 'Cannot reschedule to a past date.');
            return;
        }
        if (!location.trim()) { Alert.alert('Info', 'Location is required'); return; }
        try {
            const hours = changeDate.getHours().toString().padStart(2, '0');
            const minutes = changeDate.getMinutes().toString().padStart(2, '0');
            const payload = {
                date: changeDate.toISOString(),
                time: `${hours}:${minutes}`,
                location
            };
            if (changeModal.status === 'pending') {
                await appointmentsAPI.editDirectly(changeModal._id, payload);
                Alert.alert('Success', 'Appointment updated.');
            } else {
                await appointmentsAPI.requestChange(changeModal._id, payload);
                Alert.alert('Sent', 'Change request sent to the property owner.');
            }
            setChangeModal(null); load();
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed'); }
    };

    const handleDelete = (id) => {
        Alert.alert('Delete Request', 'Are you sure you want to withdraw this appointment request?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await appointmentsAPI.delete(id);
                        load();
                        Alert.alert('Deleted', 'Appointment request withdrawn.');
                    } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed'); }
                }
            },
        ]);
    };

    const handleRequestCancel = async () => {
        if (!cancelReason.trim()) { Alert.alert('Info', 'Please provide a reason for cancellation.'); return; }
        try {
            await appointmentsAPI.requestCancel(cancelModal._id, { reason: cancelReason.trim() });
            setCancelModal(null); setCancelReason(''); load();
            Alert.alert('Sent', 'Cancellation request sent to the property owner.');
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed'); }
    };

    const renderDateTimePicker = () => {
        if (Platform.OS === 'ios') {
            return (
                <Modal visible={showDatePicker || showTimePicker} transparent animationType="slide">
                    <TouchableOpacity style={styles.overlay} onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }} activeOpacity={1}>
                        <View style={styles.modal} onStartShouldSetResponder={() => true}>
                            {showDatePicker && (
                                <DateTimePicker value={changeDate} mode="date" display="spinner" themeVariant="light" textColor="#000000" minimumDate={new Date()} onChange={onDateChange} style={{ height: 200, width: '100%', backgroundColor: 'transparent' }} />
                            )}
                            {showTimePicker && (
                                <DateTimePicker value={changeDate} mode="time" display="spinner" themeVariant="light" textColor="#000000" minimumDate={new Date()} onChange={onTimeChange} style={{ height: 200, width: '100%', backgroundColor: 'transparent' }} />
                            )}
                            <Button title="Done" onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }} />
                        </View>
                    </TouchableOpacity>
                </Modal>
            );
        }
        return (
            <>
                {showDatePicker && <DateTimePicker value={changeDate} mode="date" display="default" minimumDate={new Date()} onChange={onDateChange} />}
                {showTimePicker && <DateTimePicker value={changeDate} mode="time" display="default" minimumDate={new Date()} onChange={onTimeChange} />}
            </>
        );
    };

    const FILTERS = ['all', 'pending', 'accepted', 'rejected', 'change_requested', 'cancelled'];
    const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);

    const renderItem = ({ item }) => (
        <Card style={styles.card}>
            <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.propName} numberOfLines={1}>{item.property?.title}</Text>
                    <Text style={styles.meta}>
                        {new Date(item.date).toLocaleDateString()} • {item.time}
                    </Text>
                </View>
                <Badge status={item.status} />
            </View>
            <View style={styles.infoGrid}>
                <View style={styles.infoRow}><Ionicons name="location-outline" size={14} color={colors.primary} /><Text style={styles.infoText} numberOfLines={1}>{item.location}</Text></View>
                <View style={styles.infoRow}><Ionicons name="person-outline" size={14} color={colors.primary} /><Text style={styles.infoText}>Owner: {item.owner?.name}</Text></View>
                <View style={styles.infoRow}><Ionicons name="call-outline" size={14} color={colors.primary} /><Text style={styles.infoText}>{item.owner?.phone || 'No phone'}</Text></View>
            </View>

            {(item.nicFront || item.nicBack) && (
                <View style={[styles.infoBox, { backgroundColor: colors.surfaceContainerHighest, marginTop: spacing.sm }]}>
                    <Text style={{ ...typography.labelMd, color: colors.onSurface, marginBottom: 4 }}>NIC Photos:</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        {item.nicFront && (
                            <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }} onPress={() => Linking.openURL(`${BASE_URL}${item.nicFront}`)}>
                                <Ionicons name="id-card-outline" size={16} color={colors.primary} />
                                <Text style={{ ...typography.labelMd, color: colors.primary }}>View Front</Text>
                            </TouchableOpacity>
                        )}
                        {item.nicBack && (
                            <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }} onPress={() => Linking.openURL(`${BASE_URL}${item.nicBack}`)}>
                                <Ionicons name="card-outline" size={16} color={colors.primary} />
                                <Text style={{ ...typography.labelMd, color: colors.primary }}>View Back</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {item.status === 'rejected' && item.rejectionReason && (
                <View style={styles.rejBox}><Text style={styles.rejText}>Reason: {item.rejectionReason}</Text></View>
            )}
            {item.status === 'cancelled' && (
                <View style={[styles.rejBox, { backgroundColor: colors.outlineVariant + '40' }]}><Text style={[styles.rejText, { color: colors.onSurface }]}>Cancelled{item.cancellationReason ? `: ${item.cancellationReason}` : ''}</Text></View>
            )}
            {item.status === 'change_requested' && (
                <View style={styles.infoBox}><Text style={styles.infoBoxText}>{item.changeRequest?.isCancellation ? 'Cancellation request pending owner review...' : 'Change request pending owner review...'}</Text></View>
            )}
            {item.status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                    <Button
                        title="Delete"
                        variant="danger"
                        size="sm"
                        style={{ flex: 1 }}
                        onPress={() => handleDelete(item._id)}
                        icon={<Ionicons name="trash-outline" size={16} color={colors.onPrimary} />}
                    />
                    <Button
                        title="Edit"
                        variant="outline"
                        size="sm"
                        style={{ flex: 1 }}
                        onPress={() => { setChangeModal(item); setChangeForm({ location: item.location || '' }); setChangeDate(new Date(item.date)); }}
                        icon={<Ionicons name="create-outline" size={16} color={colors.primary} />}
                    />
                </View>
            )}
            {item.status === 'accepted' && (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                    <Button
                        title="Reschedule"
                        variant="outline"
                        size="sm"
                        style={{ flex: 1 }}
                        onPress={() => { setChangeModal(item); setChangeForm({ location: item.location || '' }); setChangeDate(new Date(item.date)); }}
                        icon={<Ionicons name="create-outline" size={16} color={colors.primary} />}
                    />
                    <Button
                        title="Cancel Appt."
                        variant="danger"
                        size="sm"
                        style={{ flex: 1 }}
                        onPress={() => { setCancelModal(item); setCancelReason(''); }}
                        icon={<Ionicons name="close-circle-outline" size={16} color={colors.onPrimary} />}
                    />
                </View>
            )}
        </Card>
    );

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Appointments</Text>
                <Text style={styles.headerSub}>{appointments.length} total</Text>
            </View>

            <View>
                <FlatList horizontal showsHorizontalScrollIndicator={false} data={FILTERS} keyExtractor={i => i}
                    contentContainerStyle={styles.filterBar}
                    renderItem={({ item: f }) => (
                        <TouchableOpacity style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
                            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={i => i._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
                ListEmptyComponent={() => !loading && (
                    <View style={styles.empty}>
                        <Ionicons name="calendar-outline" size={54} color={colors.outlineVariant} />
                        <Text style={styles.emptyText}>No appointments yet</Text>
                    </View>
                )}
            />

            <Modal visible={!!changeModal} transparent animationType="slide" onRequestClose={() => setChangeModal(null)}>
                <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Request Reschedule</Text>

                        <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                            <View pointerEvents="none">
                                <Input label="New Date" value={changeDate.toLocaleDateString()} icon={<Ionicons name="calendar-outline" size={20} color={colors.outline} />} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowTimePicker(true)} activeOpacity={0.8}>
                            <View pointerEvents="none">
                                <Input label="New Time" value={`${changeDate.getHours().toString().padStart(2, '0')}:${changeDate.getMinutes().toString().padStart(2, '0')}`} icon={<Ionicons name="time-outline" size={20} color={colors.outline} />} />
                            </View>
                        </TouchableOpacity>

                        {renderDateTimePicker()}

                        <Input label="New Location" placeholder="Meeting location" value={changeForm.location} onChangeText={v => setChangeForm(p => ({ ...p, location: v }))} />
                        <View style={styles.modalBtns}>
                            <Button title="Cancel" variant="ghost" style={styles.half} onPress={() => setChangeModal(null)} />
                            <Button title="Send Request" style={styles.half} onPress={handleChangeRequest} />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Cancellation Modal */}
            <Modal visible={!!cancelModal} transparent animationType="slide" onRequestClose={() => setCancelModal(null)}>
                <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Request Cancellation</Text>
                        <Text style={{ ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.sm }}>
                            Please provide a reason for cancelling this appointment. The owner must approve.
                        </Text>
                        <TextInput
                            style={styles.reasonInput}
                            placeholder="Reason for cancellation..."
                            placeholderTextColor={colors.outline}
                            value={cancelReason}
                            onChangeText={setCancelReason}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.modalBtns}>
                            <Button title="Back" variant="ghost" style={styles.half} onPress={() => setCancelModal(null)} />
                            <Button title="Send Request" variant="danger" style={styles.half} onPress={handleRequestCancel} />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { padding: spacing.margin, backgroundColor: colors.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
    headerTitle: { ...typography.h2, color: colors.onSurface },
    headerSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
    filterBar: { paddingHorizontal: spacing.margin, paddingVertical: spacing.sm, gap: spacing.sm },
    filterChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: colors.outlineVariant },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    filterTextActive: { color: colors.onPrimary },
    list: { padding: spacing.margin, paddingBottom: 100 },
    card: { marginBottom: spacing.sm, padding: spacing.md },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
    propName: { ...typography.h3, fontSize: 15, color: colors.onSurface },
    meta: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
    infoGrid: { gap: 6, borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: spacing.sm },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoText: { ...typography.bodySm, color: colors.onSurface, flex: 1 },
    rejBox: { backgroundColor: colors.errorContainer, borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm },
    rejText: { ...typography.bodySm, color: colors.onErrorContainer },
    infoBox: { backgroundColor: colors.surfaceContainerLow, borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm },
    infoBoxText: { ...typography.bodySm, color: colors.onSurfaceVariant },
    empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, gap: spacing.sm },
    modalTitle: { ...typography.h3, color: colors.onSurface },
    modalBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    half: { flex: 1 },
    reasonInput: { borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 12, padding: spacing.md, ...typography.bodyMd, color: colors.onSurface, height: 100, textAlignVertical: 'top' },
});

