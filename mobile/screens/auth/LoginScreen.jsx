import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    KeyboardAvoidingView, Platform, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors, typography, spacing, radius, shadows } from '../../constants/theme';

export default function LoginScreen({ navigation }) {
    const { login } = useAuth();
    const [role, setRole] = useState('tenant');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const e = {};
        if (!email.trim()) e.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email';
        if (!password) e.password = 'Password is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleLogin = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            await login({ email, password });
        } catch (err) {
            Alert.alert('Login Failed', err?.response?.data?.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {/* Brand Header */}
                <View style={styles.brand}>
                    <View style={styles.logoCircle}>
                        <Ionicons name="home" size={32} color={colors.onPrimary} />
                    </View>
                    <Text style={styles.appName}>GreenLease</Text>
                    <Text style={styles.tagline}>Your trusted rental companion</Text>
                </View>

                {/* Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Welcome Back</Text>
                    <Text style={styles.cardSub}>Sign in to continue</Text>

                    {/* Role Selector */}
                    <View style={styles.segmented}>
                        {['tenant', 'owner'].map((r) => (
                            <TouchableOpacity
                                key={r}
                                style={[styles.segTab, role === r && styles.segTabActive]}
                                onPress={() => setRole(r)}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={r === 'tenant' ? 'person' : 'business'}
                                    size={16}
                                    color={role === r ? colors.primary : colors.onSurfaceVariant}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={[styles.segText, role === r && styles.segTextActive]}>
                                    {r === 'tenant' ? 'Tenant' : 'Property Owner'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Input
                        label="Email Address"
                        placeholder="name@example.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        error={errors.email}
                        icon={<Ionicons name="mail-outline" size={20} color={colors.outline} />}
                    />
                    <Input
                        label="Password"
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        error={errors.password}
                        icon={<Ionicons name="lock-closed-outline" size={20} color={colors.outline} />}
                    />

                    <Button title="Sign In" onPress={handleLogin} loading={loading} size="lg" style={{ marginTop: spacing.sm }} />

                    <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account?{' '}</Text>
                        <Text style={styles.footerLink}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background, height: Platform.OS === 'web' ? '100vh' : '100%' },
    scroll: { flexGrow: 1, padding: spacing.margin, paddingVertical: 60, justifyContent: 'center' },
    brand: { alignItems: 'center', marginBottom: spacing.xl },
    logoCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.md, ...shadows.button,
    },
    appName: { ...typography.h1, color: colors.primary, marginBottom: spacing.xs },
    tagline: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    card: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: 20, padding: spacing.xl, ...shadows.modal,
    },
    cardTitle: { ...typography.h2, color: colors.onSurface, marginBottom: spacing.xs },
    cardSub: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.lg },
    segmented: {
        flexDirection: 'row', backgroundColor: colors.surfaceContainer,
        borderRadius: 12, padding: 4, marginBottom: spacing.lg,
    },
    segTab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: spacing.sm, borderRadius: 9, gap: 4,
    },
    segTabActive: {
        backgroundColor: colors.surfaceContainerLowest,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
    },
    segText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    segTextActive: { color: colors.primary },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg, alignItems: 'center' },
    footerText: { ...typography.bodySm, color: colors.onSurfaceVariant },
    footerLink: { ...typography.labelMd, color: colors.primary },
});
