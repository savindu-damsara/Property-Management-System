import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, RefreshControl, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appointmentsAPI } from '../../services/api';
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
    const [filter, setFilter] = useState('all');

    const load = useCallback(async () => {
        try {
            const { data } = await appointmentsAPI.getAll();
            setAppointments(data || []);
        } catch (err) { console.log(err?.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (event.type === 'set' && selectedDate) {
            setChangeDate(prev => {
                const newDate = new Date(prev);
                newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                return newDate;
            });
        }
    };

    const onTimeChange = (event, selectedTime) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (event.type === 'set' && selectedTime) {
            setChangeDate(prev => {
                const newDate = new Date(prev);
                newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
                return newDate;
            });
        }
    };

    const handleChangeRequest = async () => {
        const { location } = changeForm;
        if (!location) { Alert.alert('Info', 'Location is required'); return; }
        try {
            const hours = changeDate.getHours().toString().padStart(2, '0');
            const minutes = changeDate.getMinutes().toString().padStart(2, '0');
            await appointmentsAPI.requestChange(changeModal._id, {
                date: changeDate.toISOString(),
                time: `${hours}:${minutes}`,
                location
            });
            setChangeModal(null); load();
            Alert.alert('Sent', 'Change request sent to the property owner.');
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed'); }
    };

    const FILTERS = ['all', 'pending', 'accepted', 'rejected', 'change_requested'];
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
            {item.status === 'rejected' && item.rejectionReason && (
                <View style={styles.rejBox}><Text style={styles.rejText}>Reason: {item.rejectionReason}</Text></View>
            )}
            {item.status === 'change_requested' && (
                <View style={styles.infoBox}><Text style={styles.infoBoxText}>Change request pending owner review...</Text></View>
            )}
            {['accepted', 'pending'].includes(item.status) && (
                <Button
                    title="Request Change"
                    variant="outline"
                    size="sm"
                    style={{ marginTop: spacing.sm }}
                    onPress={() => { setChangeModal(item); setChangeForm({ location: item.location || '' }); setChangeDate(new Date(item.date)); }}
                    icon={<Ionicons name="create-outline" size={16} color={colors.primary} />}
                />
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
                <View style={styles.overlay}>
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

                        {showDatePicker && <DateTimePicker value={changeDate} mode="date" display="default" onChange={onDateChange} />}
                        {showTimePicker && <DateTimePicker value={changeDate} mode="time" display="default" onChange={onTimeChange} />}

                        <Input label="New Location" placeholder="Meeting location" value={changeForm.location} onChangeText={v => setChangeForm(p => ({ ...p, location: v }))} />
                        <View style={styles.modalBtns}>
                            <Button title="Cancel" variant="ghost" style={styles.half} onPress={() => setChangeModal(null)} />
                            <Button title="Send Request" style={styles.half} onPress={handleChangeRequest} />
                        </View>
                    </View>
                </View>
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
});
