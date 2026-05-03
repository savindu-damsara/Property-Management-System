import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    KeyboardAvoidingView, Platform, StatusBar, Alert, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors, typography, spacing, shadows } from '../../constants/theme';

export default function RegisterScreen({ navigation }) {
    const { register } = useAuth();
    const [role, setRole] = useState('tenant');
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
    const [avatar, setAvatar] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const pickAvatar = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission', 'Gallery access required'); return; }
        const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, aspect: [1, 1], allowsEditing: true });
        if (!r.canceled && r.assets?.[0]) setAvatar(r.assets[0]);
    };

    const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const validate = () => {
        const e = {};
        if (!form.name.trim() || !/^[A-Za-z\s]+$/.test(form.name)) e.name = 'Name must contain only letters';
        if (!form.email.trim()) e.email = 'Email is required';
        else if (!/^[A-Za-z0-9_.]+@[A-Za-z0-9]+\.(com|lk)$/i.test(form.email)) e.email = 'Email must end with .com or .lk';
        if (!form.phone.trim()) {
            e.phone = 'Phone number is required';
        } else {
            const phone = form.phone.trim();
            const localPhone = /^\d{10}$/.test(phone);
            const intlPhone = /^\+\d{11}$/.test(phone);
            if (!localPhone && !intlPhone) {
                e.phone = 'Enter 10 digits, or + followed by 11 digits';
            }
        }
        if (!form.password) e.password = 'Password is required';
        else if (!/^(?=.*[A-Z])(?=.*\d).{6,}$/.test(form.password)) e.password = 'Min 6 chars, uppercase & number required';
        if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('name', form.name);
            fd.append('email', form.email);
            fd.append('phone', form.phone);
            fd.append('password', form.password);
            fd.append('role', role);
            if (avatar) fd.append('avatar', { uri: avatar.uri, type: 'image/jpeg', name: 'avatar.jpg' });

            await register(fd);
        } catch (err) {
            Alert.alert('Registration Failed', err?.response?.data?.message || 'Please try again');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'android' ? 150 : 40 }]} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: spacing.md }}>
                        <Ionicons name="arrow-back" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.logoCircle}>
                        <Ionicons name="home" size={28} color={colors.onPrimary} />
                    </View>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join GreenLease to find your perfect home</Text>
                </View>

                <View style={styles.card}>
                    {/* Role Selector */}
                    <Text style={styles.sectionLabel}>I am a...</Text>
                    <View style={styles.roleRow}>
                        {[
                            { key: 'tenant', label: 'Tenant', icon: 'person', desc: 'Looking for a rental' },
                            { key: 'owner', label: 'Property Owner', icon: 'business', desc: 'List my properties' },
                        ].map((r) => (
                            <TouchableOpacity
                                key={r.key}
                                style={[styles.roleCard, role === r.key && styles.roleCardActive]}
                                onPress={() => setRole(r.key)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name={r.icon} size={24} color={role === r.key ? colors.primary : colors.onSurfaceVariant} />
                                <Text style={[styles.roleLabel, role === r.key && { color: colors.primary }]}>{r.label}</Text>
                                <Text style={styles.roleDesc}>{r.desc}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.8}>
                        {avatar ? (
                            <Image source={{ uri: avatar.uri }} style={styles.avatarImg} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="camera" size={32} color={colors.onPrimary} />
                            </View>
                        )}
                        <Text style={styles.avatarLabel}>{avatar ? 'Change Avatar' : 'Upload Avatar'}</Text>
                    </TouchableOpacity>


                    <Input label="Full Name" placeholder="John Doe" value={form.name} onChangeText={v => setField('name', v)} error={errors.name}
                        icon={<Ionicons name="person-outline" size={20} color={colors.outline} />} />
                    <Input label="Email Address" placeholder="john@example.com" value={form.email} onChangeText={v => setField('email', v)}
                        keyboardType="email-address" autoCapitalize="none" error={errors.email}
                        icon={<Ionicons name="mail-outline" size={20} color={colors.outline} />} />
                    <Input label="Phone Number" placeholder="+94 77 123 4567" value={form.phone} onChangeText={v => setField('phone', v)}
                        keyboardType="phone-pad" error={errors.phone}
                        icon={<Ionicons name="call-outline" size={20} color={colors.outline} />} />
                    <Input label="Password" placeholder="Min. 6 characters" value={form.password} onChangeText={v => setField('password', v)}
                        secureTextEntry error={errors.password}
                        icon={<Ionicons name="lock-closed-outline" size={20} color={colors.outline} />} />
                    <Input label="Confirm Password" placeholder="Repeat password" value={form.confirmPassword} onChangeText={v => setField('confirmPassword', v)}
                        secureTextEntry error={errors.confirmPassword}
                        icon={<Ionicons name="shield-checkmark-outline" size={20} color={colors.outline} />} />

                    <Button title="Create Account" onPress={handleRegister} loading={loading} size="lg" style={{ marginTop: spacing.sm }} />

                    <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account?{' '}</Text>
                        <Text style={styles.footerLink}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background, height: Platform.OS === 'web' ? '100vh' : '100%' },
    scroll: { flexGrow: 1, padding: spacing.margin, paddingVertical: spacing.xl },
    header: { marginBottom: spacing.xl },
    logoCircle: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.md,
    },
    title: { ...typography.h1, color: colors.onSurface, marginBottom: spacing.xs },
    subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    card: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: 20, padding: spacing.xl, ...shadows.modal,
    },
    sectionLabel: { ...typography.labelMd, color: colors.onSurfaceVariant, marginBottom: spacing.sm },
    roleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    roleCard: {
        flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: 12,
        borderWidth: 1.5, borderColor: colors.outlineVariant, gap: 4,
    },
    roleCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryFixed + '33' },
    roleLabel: { ...typography.labelMd, color: colors.onSurface, textAlign: 'center' },
    roleDesc: { ...typography.bodySm, color: colors.onSurfaceVariant, textAlign: 'center', fontSize: 10 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg, alignItems: 'center' },
    footerText: { ...typography.bodySm, color: colors.onSurfaceVariant },
    footerLink: { ...typography.labelMd, color: colors.primary },
    avatarWrap: { alignItems: 'center', marginBottom: spacing.lg },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarImg: { width: 80, height: 80, borderRadius: 40 },
    avatarLabel: { ...typography.bodySm, color: colors.primary, marginTop: spacing.xs },
});

