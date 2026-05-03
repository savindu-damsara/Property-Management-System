import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { noticesAPI, authAPI, BASE_URL } from '../../services/api';
import Card from '../../components/Card';
import { colors, typography, spacing } from '../../constants/theme';

export default function NoticesOwnerScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await noticesAPI.getAll();
            setNotices(data || []);
        } catch (err) { console.log(err?.message); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useFocusEffect(useCallback(() => {
        load();
        authAPI.clearNotification('notices').catch(() => { });
    }, [load]));

    const openCreate = () => {
        navigation.navigate('AddEditNotice');
    };

    const openEdit = (n) => {
        navigation.navigate('AddEditNotice', { notice: n });
    };

    const handleDelete = (id) => {
        Alert.alert('Delete Notice', 'This will permanently delete the notice.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => { try { await noticesAPI.delete(id); setNotices(p => p.filter(n => n._id !== id)); } catch (err) { Alert.alert('Error', 'Failed to delete'); } } },
        ]);
    };

    const renderItem = ({ item }) => (
        <Card style={styles.card}>
            <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.noticeTitle}>{item.title}</Text>
                    <Text style={styles.noticeMeta}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    {item.targetAll ? (
                        <Text style={styles.targetLabel}>All Active Properties</Text>
                    ) : item.targetProperties?.length > 0 ? (
                        <Text style={styles.targetLabel}>{item.targetProperties.length} Properties Targeted</Text>
                    ) : null}
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
                        <Ionicons name="create-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item._id)}>
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
            <Text style={styles.noticeContent} numberOfLines={3}>{item.content}</Text>

            {item.documents && item.documents.length > 0 && (
                <View style={{ marginTop: spacing.sm, gap: 6 }}>
                    {item.documents.map((doc, idx) => (
                        <TouchableOpacity key={idx} style={styles.attachRow} onPress={() => Linking.openURL(`${BASE_URL}${doc}`)}>
                            <Ionicons name="attach" size={16} color={colors.primary} />
                            <Text style={styles.attachText}>Attachment {idx + 1}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </Card>
    );

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.sm }}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notice Board</Text>
            </View>
            <FlatList
                data={notices}
                keyExtractor={i => i._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
                ListEmptyComponent={() => !loading && (
                    <View style={styles.empty}>
                        <Ionicons name="megaphone-outline" size={54} color={colors.outlineVariant} />
                        <Text style={styles.emptyText}>No notices yet</Text>
                    </View>
                )}
            />
            <TouchableOpacity style={styles.fab} onPress={openCreate}>
                <Ionicons name="add" size={28} color={colors.onPrimary} />
            </TouchableOpacity>
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
    list: { padding: spacing.margin, paddingBottom: 100 },
    card: { marginBottom: spacing.sm, padding: spacing.md },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
    noticeTitle: { ...typography.h3, fontSize: 15, color: colors.onSurface },
    noticeMeta: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
    targetLabel: { ...typography.labelMd, color: '#e65100', marginTop: 4 },
    actions: { flexDirection: 'row', gap: spacing.xs },
    actionBtn: { padding: spacing.xs },
    noticeContent: { ...typography.bodyMd, color: colors.onSurface },
    attachRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
    attachText: { ...typography.bodySm, color: colors.primary },
    empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
    emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
    fab: {
        position: 'absolute', bottom: 90, right: spacing.margin,
        width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
});
