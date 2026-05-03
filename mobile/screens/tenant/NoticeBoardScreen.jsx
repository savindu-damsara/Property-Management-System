import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { noticesAPI, authAPI, BASE_URL } from '../../services/api';
import Card from '../../components/Card';
import { colors, typography, spacing } from '../../constants/theme';

export default function NoticeBoardScreen() {
    const insets = useSafeAreaInsets();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expanded, setExpanded] = useState(null);

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

    useEffect(() => { load(); }, [load]);

    const renderItem = ({ item, index }) => {
        const isExpanded = expanded === item._id;
        const isNew = new Date() - new Date(item.createdAt) < 7 * 24 * 60 * 60 * 1000;

        return (
            <Card style={styles.card}>
                <TouchableOpacity onPress={() => setExpanded(isExpanded ? null : item._id)} activeOpacity={0.8}>
                    <View style={styles.noticeHeader}>
                        <View style={styles.noticeIconWrap}>
                            <Ionicons name="megaphone" size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={styles.titleRow}>
                                <Text style={styles.noticeTitle} numberOfLines={isExpanded ? 5 : 1}>{item.title}</Text>
                                {isNew && <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>}
                            </View>
                            <View style={styles.metaRow}>
                                <Ionicons name="person-outline" size={12} color={colors.onSurfaceVariant} />
                                <Text style={styles.metaText}>{item.owner?.name}</Text>
                                <Text style={styles.metaDot}>·</Text>
                                <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                            </View>
                        </View>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.outline} />
                    </View>
                    {isExpanded && (
                        <View style={styles.noticeBody}>
                            <Text style={styles.noticeContent}>{item.content}</Text>
                            {item.documents && item.documents.length > 0 && (
                                <View style={{ marginTop: spacing.sm, gap: 6 }}>
                                    {item.documents.map((doc, idx) => {
                                        const url = doc.startsWith('http') ? doc : `${BASE_URL}${doc}`;
                                        return (
                                            <TouchableOpacity
                                                key={idx}
                                                style={styles.attachRow}
                                                onPress={async () => {
                                                    try {
                                                        const canOpen = await Linking.canOpenURL(url);
                                                        if (canOpen) {
                                                            await Linking.openURL(url);
                                                        } else {
                                                            Alert.alert('Cannot Open', 'No app available to open this file.');
                                                        }
                                                    } catch (e) {
                                                        Alert.alert('Error', 'Could not open attachment: ' + e.message);
                                                    }
                                                }}
                                            >
                                                <Ionicons name="attach" size={16} color={colors.primary} />
                                                <Text style={styles.attachText}>Attachment {idx + 1}</Text>
                                                <Ionicons name="open-outline" size={14} color={colors.primary} />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    )}
                </TouchableOpacity>
            </Card>
        );
    };

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Ionicons name="megaphone" size={22} color={colors.onPrimary} />
                </View>
                <View>
                    <Text style={styles.headerTitle}>Notice Board</Text>
                    <Text style={styles.headerSub}>{notices.length} announcements</Text>
                </View>
            </View>

            <FlatList
                data={notices}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
                ListEmptyComponent={() => !loading && (
                    <View style={styles.empty}>
                        <Ionicons name="megaphone-outline" size={64} color={colors.outlineVariant} />
                        <Text style={styles.emptyTitle}>No announcements yet</Text>
                        <Text style={styles.emptySub}>Your landlord's notices will appear here</Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        padding: spacing.margin, backgroundColor: colors.surfaceContainerLowest,
        borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
    },
    headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { ...typography.h3, color: colors.onSurface },
    headerSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
    list: { padding: spacing.margin, paddingBottom: 100 },
    card: { marginBottom: spacing.sm, padding: spacing.md },
    noticeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    noticeIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryFixed + '33', alignItems: 'center', justifyContent: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
    noticeTitle: { ...typography.h3, fontSize: 14, color: colors.onSurface, flex: 1 },
    newBadge: { backgroundColor: colors.primary, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
    newBadgeText: { ...typography.labelMd, fontSize: 9, color: colors.onPrimary },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    metaText: { ...typography.bodySm, color: colors.onSurfaceVariant },
    metaDot: { ...typography.bodySm, color: colors.outlineVariant },
    noticeBody: { borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: spacing.sm, marginTop: spacing.sm },
    noticeContent: { ...typography.bodyMd, color: colors.onSurface, lineHeight: 24 },
    attachRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
    attachText: { ...typography.bodySm, color: colors.primary },
    empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
    emptyTitle: { ...typography.h3, color: colors.onSurface },
    emptySub: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
});
