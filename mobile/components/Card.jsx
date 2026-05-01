import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, shadows, spacing } from '../constants/theme';

const Card = ({ children, style, variant = 'default', padding = 'md' }) => {
    const padMap = { sm: spacing.sm, md: spacing.md, lg: spacing.lg, none: 0 };
    return (
        <View style={[
            styles.card,
            variant === 'elevated' && styles.elevated,
            variant === 'filled' && styles.filled,
            { padding: padMap[padding] ?? spacing.md },
            style,
        ]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.surfaceVariant,
        ...shadows.card,
    },
    elevated: {
        borderWidth: 0,
        ...shadows.modal,
    },
    filled: {
        backgroundColor: colors.surfaceContainerLow,
        borderWidth: 0,
        shadowOpacity: 0,
        elevation: 0,
    },
});

export default Card;
