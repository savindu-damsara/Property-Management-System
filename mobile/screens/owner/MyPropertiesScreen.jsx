import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, RefreshControl, Alert, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { propertiesAPI } from '../../services/api';
import { BASE_URL } from '../../services/api';
import Card from '../../components/Card';
import { colors, typography, spacing, shadows } from '../../constants/theme';

const formatLKR = (n) => `LKR ${Number(n).toLocaleString()}`;

export default function MyPropertiesScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await propertiesAPI.getMine();
            setProperties(data || []);
        } catch (err) {
            console.log(err?.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleDelete = (id) => {
        Alert.alert('Remove Property', 'Remove this property from listing?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: async () => {
                    try {
                        await propertiesAPI.delete(id);
                        setProperties(ps => ps.filter(p => p._id !== id));
                    } catch (err) {
                        Alert.alert('Error', err?.response?.data?.message || 'Failed to delete');
                    }
                },
            },
        ]);
    };

    const renderItem = ({ item }) => {
        const imgUri = item.images?.[0] ? `${BASE_URL}${item.images[0]}` : null;
        return (
            <Card style={styles.propCard}>
                {imgUri ? (
                    <Image source={{ uri: imgUri }} style={styles.propImg} resizeMode="cover" />
                ) : (
                    <View style={[styles.propImg, styles.noImg]}>
                        <Ionicons name="home" size={40} color={colors.outlineVariant} />
                    </View>
                )}
                <View style={styles.propBody}>
                    <View style={styles.propHeader}>
                        <Text style={styles.propTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={[styles.availBadge, { backgroundColor: item.isAvailable ? colors.secondaryContainer : colors.errorContainer }]}>
                            <Text style={[styles.availText, { color: item.isAvailable ? colors.onSecondaryContainer : colors.onErrorContainer }]}>
                                {item.isAvailable ? 'Available' : 'Rented'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.locRow}>
                        <Ionicons name="location-outline" size={14} color={colors.onSurfaceVariant} />
                        <Text style={styles.locText} numberOfLines={1}>{item.address}, {item.city}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <View style={styles.infoChip}><Ionicons name="bed-outline" size={14} color={colors.primary} /><Text style={styles.infoChipText}>{item.bedrooms} Beds</Text></View>
                        <View style={styles.infoChip}><Ionicons name="water-outline" size={14} color={colors.primary} /><Text style={styles.infoChipText}>{item.bathrooms} Baths</Text></View>
                        {item.area > 0 && <View style={styles.infoChip}><Ionicons name="resize-outline" size={14} color={colors.primary} /><Text style={styles.infoChipText}>{item.area} sq ft</Text></View>}
                    </View>
                    <Text style={styles.price}>{formatLKR(item.rentPerMonth)}/mo</Text>
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => navigation.navigate('AddEditProperty', { property: item })}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="create-outline" size={16} color={colors.primary} />
                            <Text style={styles.editText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDelete(item._id)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="trash-outline" size={16} color={colors.error} />
                            <Text style={styles.deleteText}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Card>
        );
    };

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Properties</Text>
                <Text style={styles.headerSub}>{properties.length} listing{properties.length !== 1 ? 's' : ''}</Text>
            </View>
            <FlatList
                data={properties}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
                ListEmptyComponent={() => !loading && (
                    <View style={styles.empty}>
                        <Ionicons name="home-outline" size={64} color={colors.outlineVariant} />
                        <Text style={styles.emptyTitle}>No Properties Yet</Text>
                        <Text style={styles.emptySub}>Tap the + button to add your first listing</Text>
                    </View>
                )}
            />
            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddEditProperty', {})}
                activeOpacity={0.85}
            >
                <Ionicons name="add" size={28} color={colors.onPrimary} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
        padding: spacing.margin, backgroundColor: colors.surfaceContainerLowest,
        borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
    },
    headerTitle: { ...typography.h2, color: colors.onSurface },
    headerSub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
    list: { padding: spacing.margin, paddingBottom: 100 },
    propCard: { marginBottom: spacing.md, padding: 0, overflow: 'hidden' },
    propImg: { width: '100%', height: 180, backgroundColor: colors.surfaceContainerLow },
    noImg: { alignItems: 'center', justifyContent: 'center' },
    propBody: { padding: spacing.md },
    propHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.xs },
    propTitle: { ...typography.h3, color: colors.onSurface, flex: 1, marginRight: spacing.sm },
    availBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
    availText: { ...typography.labelMd, fontSize: 10 },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
    locText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
    infoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    infoChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: colors.surfaceContainer, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3,
    },
    infoChipText: { ...typography.labelMd, color: colors.onSurface, fontSize: 11 },
    price: { ...typography.h3, color: colors.primary, marginBottom: spacing.md },
    actionRow: { flexDirection: 'row', gap: spacing.sm },
    editBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10, paddingVertical: 10,
    },
    editText: { ...typography.button, color: colors.primary, fontSize: 14 },
    deleteBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        borderWidth: 1.5, borderColor: colors.error, borderRadius: 10, paddingVertical: 10,
    },
    deleteText: { ...typography.button, color: colors.error, fontSize: 14 },
    empty: { flex: 1, alignItems: 'center', paddingTop: 100, gap: spacing.sm },
    emptyTitle: { ...typography.h3, color: colors.onSurface },
    emptySub: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center' },
    fab: {
        position: 'absolute', bottom: 90, right: spacing.margin,
        width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center', ...shadows.button,
    },
});
