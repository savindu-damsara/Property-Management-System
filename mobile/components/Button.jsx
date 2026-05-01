import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors, typography, radius, shadows, spacing } from '../constants/theme';

const Button = ({
    title, onPress, variant = 'primary', size = 'md',
    loading = false, disabled = false, icon, style, textStyle,
}) => {
    const styles = getStyles(variant, size);
    return (
        <TouchableOpacity
            style={[styles.btn, disabled || loading ? styles.disabled : {}, style]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : colors.primary} size="small" />
            ) : (
                <View style={styles.inner}>
                    {icon && <View style={{ marginRight: spacing.sm }}>{icon}</View>}
                    <Text style={[styles.text, textStyle]}>{title}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const getStyles = (variant, size) => {
    const heights = { sm: 40, md: 48, lg: 56 };
    const bg = {
        primary: colors.primary,
        secondary: colors.secondaryContainer,
        ghost: 'transparent',
        outline: 'transparent',
        danger: colors.error,
    };
    const textCol = {
        primary: colors.onPrimary,
        secondary: colors.onSecondaryContainer,
        ghost: colors.primary,
        outline: colors.primary,
        danger: colors.onError,
    };

    return StyleSheet.create({
        btn: {
            backgroundColor: bg[variant] || colors.primary,
            height: heights[size] || 48,
            borderRadius: radius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.lg,
            borderWidth: variant === 'outline' ? 1 : 0,
            borderColor: variant === 'outline' ? colors.primary : 'transparent',
            ...(variant === 'primary' || variant === 'danger' ? shadows.button : {}),
        },
        inner: { flexDirection: 'row', alignItems: 'center' },
        text: {
            ...typography.button,
            color: textCol[variant] || colors.onPrimary,
        },
        disabled: { opacity: 0.5 },
    });
};

export default Button;
