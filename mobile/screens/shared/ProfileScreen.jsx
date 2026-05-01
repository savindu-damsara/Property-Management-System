import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { authAPI, BASE_URL } from '../../services/api';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import { colors, typography, spacing, shadows } from '../../constants/theme';

export default function ProfileScreen({ navigation }) {
    const { user, logout, updateUser } = useAuth();
    const insets = useSafeAreaInsets();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
    const [saving, setSaving] = useState(false);

    const avatarUri = user?.avatar ? `${BASE_URL}${user.avatar}` : null;
    const initial = (user?.name || 'U')[0].toUpperCase();

    const handlePickAvatar = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, aspect: [1, 1], allowsEditing: true });
        if (!r.canceled && r.assets?.[0]) {
            // In production, upload to backend; for now just store uri
            Alert.alert('Info', 'Avatar upload to be integrated with hosted backend');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data } = await authAPI.updateProfile({ name: form.name, phone: form.phone });
            updateUser({ ...user, ...data });
            setEditing(false);
            Alert.alert('Success', 'Profile updated!');
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to update');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
        ]);
    };

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                {navigation?.canGoBack?.() && (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.sm }}>
                        <Ionicons name="arrow-back" size={24} color={colors.primary} />
                    </TouchableOpacity>
                )}
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity onPress={() => setEditing(!editing)} style={{ marginLeft: 'auto' }}>
                    <Ionicons name={editing ? 'close' : 'create-outline'} size={22} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8}>
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                        ) : (
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarInitial}>{initial}</Text>
                            </View>
                        )}
                        <View style={styles.avatarEdit}>
                            <Ionicons name="camera" size={14} color={colors.onPrimary} />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.userName}>{user?.name}</Text>
                    <Badge status={user?.role} label={user?.role === 'owner' ? 'Property Owner' : 'Tenant'} />
                </View>

                {/* Info Card */}
                <Card style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Account Information</Text>
                    {editing ? (
                        <>
                            <Input label="Full Name" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} icon={<Ionicons name="person-outline" size={18} color={colors.outline} />} />
                            <Input label="Phone" value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} keyboardType="phone-pad" icon={<Ionicons name="call-outline" size={18} color={colors.outline} />} />
                            <Button title="Save Changes" onPress={handleSave} loading={saving} />
                        </>
                    ) : (
                        <View style={styles.infoRows}>
                            {[
                                { icon: 'person-outline', label: 'Name', value: user?.name },
                                { icon: 'mail-outline', label: 'Email', value: user?.email },
                                { icon: 'call-outline', label: 'Phone', value: user?.phone || 'Not set' },
                                { icon: 'shield-checkmark-outline', label: 'Role', value: user?.role === 'owner' ? 'Property Owner' : 'Tenant' },
                            ].map(item => (
                                <View key={item.label} style={styles.infoRow}>
                                    <View style={styles.infoIcon}><Ionicons name={item.icon} size={18} color={colors.primary} /></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.infoLabel}>{item.label}</Text>
                                        <Text style={styles.infoValue}>{item.value}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </Card>

                {/* Danger Zone */}
                <Card style={[styles.infoCard, { marginTop: spacing.lg }]}>
                    <Text style={styles.infoTitle}>Account Actions</Text>
                    <Button
                        title="Logout"
                        variant="danger"
                        onPress={handleLogout}
                        icon={<Ionicons name="log-out-outline" size={18} color={colors.onError} />}
                    />
                </Card>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', padding: spacing.margin,
        backgroundColor: colors.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
    },
    headerTitle: { ...typography.h3, color: colors.onSurface },
    scroll: { padding: spacing.margin, paddingBottom: 80 },
    avatarSection: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
    avatarCircle: {
        width: 90, height: 90, borderRadius: 45, backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center', ...shadows.button,
    },
    avatarImg: { width: 90, height: 90, borderRadius: 45, ...shadows.card },
    avatarInitial: { ...typography.h1, color: colors.onPrimary, fontSize: 36 },
    avatarEdit: {
        position: 'absolute', bottom: 0, right: 0,
        width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surfaceContainerLowest,
    },
    userName: { ...typography.h2, color: colors.onSurface },
    infoCard: { padding: spacing.lg },
    infoTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.md },
    infoRows: { gap: spacing.md },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    infoIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondaryContainer, alignItems: 'center', justifyContent: 'center' },
    infoLabel: { ...typography.labelMd, color: colors.onSurfaceVariant },
    infoValue: { ...typography.bodyMd, color: colors.onSurface },
});
