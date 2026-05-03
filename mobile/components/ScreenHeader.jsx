import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../constants/theme';

const ScreenHeader = ({ title, subtitle, onBack, rightAction, rightIcon }) => {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceContainerLowest} />
            <View style={styles.row}>
                {onBack && (
                    <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="arrow-back" size={24} color={colors.primary} />
                    </TouchableOpacity>
                )}
                <View style={styles.titleArea}>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                    {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
                </View>
                {rightAction && (
                    <TouchableOpacity style={styles.rightBtn} onPress={rightAction}>
                        {rightIcon || <Ionicons name="ellipsis-vertical" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: colors.surfaceContainerLowest,
        paddingHorizontal: spacing.margin,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 3,
    },
    row: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { marginRight: spacing.sm, padding: spacing.xs },
    titleArea: { flex: 1 },
    title: { ...typography.h3, color: colors.onSurface },
    subtitle: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
    rightBtn: { padding: spacing.xs },
});

export default ScreenHeader;
