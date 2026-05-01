import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, radius, spacing } from '../constants/theme';

const STATUS_CONFIG = {
    // Appointments
    pending: { bg: colors.tertiaryContainer, text: colors.onTertiaryContainer, label: 'Pending' },
    accepted: { bg: colors.secondaryContainer, text: colors.onSecondaryContainer, label: 'Accepted' },
    rejected: { bg: colors.errorContainer, text: colors.onErrorContainer, label: 'Rejected' },
    change_requested: { bg: '#fff3e0', text: '#e65100', label: 'Change Requested' },
    // Lease
    pending_approval: { bg: '#fff3e0', text: '#e65100', label: 'Pending Approval' },
    active: { bg: colors.secondaryContainer, text: colors.onSecondaryContainer, label: 'Active' },
    pending_update: { bg: '#e3f2fd', text: '#0277bd', label: 'Pending Update' },
    pending_termination: { bg: colors.errorContainer, text: colors.onErrorContainer, label: 'Pending Termination' },
    terminated: { bg: colors.surfaceContainerHighest, text: colors.onSurface, label: 'Terminated' },
    // Maintenance
    approved: { bg: colors.secondaryContainer, text: colors.onSecondaryContainer, label: 'Approved' },
    in_progress: { bg: '#e3f2fd', text: '#0277bd', label: 'In Progress' },
    completed: { bg: '#e8f5e9', text: '#2e7d32', label: 'Completed' },
    pending_deletion: { bg: colors.errorContainer, text: colors.onErrorContainer, label: 'Pending Deletion' },
    cancelled: { bg: colors.surfaceContainerHighest, text: colors.onSurface, label: 'Cancelled' },
    pending_update: { bg: '#e3f2fd', text: '#0277bd', label: 'Update Requested' },
    // Bills
    // pending_approval same as above
    // Role chips
    owner: { bg: colors.primaryContainer, text: colors.onPrimary, label: 'Owner' },
    tenant: { bg: colors.secondaryContainer, text: colors.onSecondaryContainer, label: 'Tenant' },
};

const Badge = ({ status, label, style }) => {
    const config = STATUS_CONFIG[status] || { bg: colors.surfaceContainer, text: colors.onSurface, label: status || 'Unknown' };
    const displayLabel = label || config.label;

    return (
        <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
            <Text style={[styles.text, { color: config.text }]}>{displayLabel.toUpperCase()}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        alignSelf: 'flex-start',
    },
    text: { ...typography.labelMd, },
});

export default Badge;
