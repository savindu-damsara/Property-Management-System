import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Modal,
    KeyboardAvoidingView, Platform,
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
    const [newAvatar, setNewAvatar] = useState(null);

    const [editPw, setEditPw] = useState(false);
    const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [delAccount, setDelAccount] = useState(false);
    const [delPw, setDelPw] = useState('');

    const avatarUri = newAvatar ? newAvatar.uri : (user?.avatar ? `${BASE_URL}${user.avatar}` : null);
    const initial = (user?.name || 'U')[0].toUpperCase();

    const handlePickAvatar = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, aspect: [1, 1], allowsEditing: true });
        if (!r.canceled && r.assets?.[0]) {
            setNewAvatar(r.assets[0]);
        }
    };

    const handleSave = async () => {
        if (!form.name.trim() || !/^[A-Za-z\s]+$/.test(form.name)) {
            Alert.alert('Validation Error', 'Name must contain only letters'); return;
        }
        const phone = form.phone.trim();
        if (!phone) {
            Alert.alert('Validation Error', 'Phone number is required'); return;
        }
        const localPhone = /^\d{10}$/.test(phone);
        const intlPhone = /^\+\d{11}$/.test(phone);
        if (!localPhone && !intlPhone) {
            Alert.alert('Validation Error', 'Enter 10 digits, or + followed by 11 digits'); return;
        }

        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('name', form.name);
            fd.append('phone', form.phone);
            if (newAvatar) fd.append('avatar', { uri: newAvatar.uri, type: 'image/jpeg', name: 'avatar.jpg' });

            const { data } = await authAPI.updateProfile(fd);
            updateUser({ ...user, ...data });
            setEditing(false);
            setNewAvatar(null);
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

    const handleSavePassword = async () => {
        if (!pwForm.oldPassword) { Alert.alert('Error', 'Current password needed'); return; }
        if (!/^(?=.*[A-Z])(?=.*\d).{6,}$/.test(pwForm.newPassword)) { Alert.alert('Error', 'Min 6 chars, uppercase & number required for new password'); return; }
        if (pwForm.newPassword !== pwForm.confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return; }
        setSaving(true);
        try {
            await authAPI.changePassword(pwForm);
            Alert.alert('Success', 'Password updated successfully!');
            setEditPw(false); setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed to update'); }
        finally { setSaving(false); }
    };

    const handleDeleteAccount = async () => {
        if (!delPw) { Alert.alert('Error', 'Please enter your password to confirm deletion'); return; }
        setSaving(true);
        try {
            await authAPI.deleteAccount({ password: delPw });
            Alert.alert('Deleted', 'Your account has been deleted.');
            logout();
        } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed to delete account'); }
        finally { setSaving(false); }
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

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'android' ? 150 : 40 }]}>
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8}>
                        {avatarUri ? (
                            <Image key={avatarUri} source={{ uri: avatarUri }} style={styles.avatarImg} />
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
                        title="Change Password"
                        variant="outline"
                        onPress={() => setEditPw(true)}
                        icon={<Ionicons name="key-outline" size={18} color={colors.primary} />}
                        style={{ marginBottom: spacing.sm }}
                    />
                    <Button
                        title="Delete Account"
                        variant="danger"
                        onPress={() => setDelAccount(true)}
                        icon={<Ionicons name="trash-outline" size={18} color={colors.onError} />}
                        style={{ marginBottom: spacing.sm }}
                    />
                    <Button
                        title="Logout"
                        variant="danger"
                        onPress={handleLogout}
                        icon={<Ionicons name="log-out-outline" size={18} color={colors.onError} />}
                    />
                </Card>
            </ScrollView>

            <Modal visible={editPw} transparent animationType="slide" onRequestClose={() => setEditPw(false)}>
                <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Change Password</Text>
                        <Input label="Current Password" value={pwForm.oldPassword} onChangeText={v => setPwForm(p => ({ ...p, oldPassword: v }))} secureTextEntry />
                        <Input label="New Password" value={pwForm.newPassword} onChangeText={v => setPwForm(p => ({ ...p, newPassword: v }))} secureTextEntry />
                        <Input label="Confirm Password" value={pwForm.confirmPassword} onChangeText={v => setPwForm(p => ({ ...p, confirmPassword: v }))} secureTextEntry />
                        <View style={styles.modalBtns}>
                            <Button title="Cancel" variant="ghost" onPress={() => setEditPw(false)} style={styles.half} />
                            <Button title="Save" loading={saving} onPress={handleSavePassword} style={styles.half} />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal visible={delAccount} transparent animationType="slide" onRequestClose={() => setDelAccount(false)}>
                <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Delete Account</Text>
                        <Text style={styles.modalSub}>This action is irreversible. Enter your password to confirm.</Text>
                        <Input label="Password" value={delPw} onChangeText={setDelPw} secureTextEntry />
                        <View style={styles.modalBtns}>
                            <Button title="Cancel" variant="ghost" onPress={() => { setDelAccount(false); setDelPw(''); }} style={styles.half} />
                            <Button title="Delete Forever" variant="danger" loading={saving} onPress={handleDeleteAccount} style={styles.half} />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, gap: spacing.sm },
    modalTitle: { ...typography.h3, color: colors.onSurface },
    modalSub: { ...typography.bodySm, color: colors.error },
    modalBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    half: { flex: 1 },
});
