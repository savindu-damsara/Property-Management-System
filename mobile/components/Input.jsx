import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '../constants/theme';

const Input = ({
    label, placeholder, value, onChangeText, secureTextEntry,
    keyboardType, autoCapitalize, multiline, numberOfLines,
    error, icon, rightIcon, style, inputStyle, editable = true,
}) => {
    const [focused, setFocused] = useState(false);
    const [hidePassword, setHidePassword] = useState(secureTextEntry);

    return (
        <View style={[styles.wrapper, style]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[
                styles.container,
                focused && styles.focused,
                error && styles.errorBorder,
                !editable && styles.disabled,
            ]}>
                {icon && <View style={styles.iconLeft}>{icon}</View>}
                <TextInput
                    style={[
                        styles.input,
                        icon && styles.withIconLeft,
                        (rightIcon || secureTextEntry) && styles.withIconRight,
                        multiline && styles.multiline,
                        inputStyle,
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.outline}
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={hidePassword}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize || 'sentences'}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    editable={editable}
                />
                {secureTextEntry && (
                    <TouchableOpacity style={styles.iconRight} onPress={() => setHidePassword(!hidePassword)}>
                        <Ionicons name={hidePassword ? 'eye-off' : 'eye'} size={20} color={colors.outline} />
                    </TouchableOpacity>
                )}
                {rightIcon && !secureTextEntry && <View style={styles.iconRight}>{rightIcon}</View>}
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: { marginBottom: spacing.md },
    label: {
        ...typography.labelMd,
        color: colors.onSurfaceVariant,
        marginBottom: spacing.xs,
        marginLeft: spacing.xs,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceContainerLowest,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        borderRadius: radius.lg,
        minHeight: 52,
    },
    focused: { borderColor: colors.primary, borderWidth: 1.5 },
    errorBorder: { borderColor: colors.error },
    disabled: { backgroundColor: colors.surfaceContainer, opacity: 0.7 },
    input: {
        flex: 1,
        ...typography.bodyMd,
        color: colors.onSurface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 52,
    },
    withIconLeft: { paddingLeft: spacing.sm },
    withIconRight: { paddingRight: spacing.sm },
    multiline: { textAlignVertical: 'top', paddingTop: spacing.md, minHeight: 100 },
    iconLeft: { paddingLeft: spacing.md, justifyContent: 'center' },
    iconRight: { paddingRight: spacing.md, justifyContent: 'center' },
    error: { ...typography.labelMd, color: colors.error, marginTop: spacing.xs, marginLeft: spacing.xs },
});

export default Input;
