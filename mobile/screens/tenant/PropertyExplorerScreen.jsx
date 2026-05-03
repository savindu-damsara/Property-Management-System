import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, RefreshControl, Image, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { propertiesAPI, leasesAPI, BASE_URL } from '../../services/api';
import Card from '../../components/Card';
import { colors, typography, spacing } from '../../constants/theme';

const formatLKR = (n) => `LKR ${Number(n).toLocaleString()}`;

export default function PropertyExplorerScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const [viewMode, setViewMode] = useState('available'); // 'available' | 'leased'

    const load = useCallback(async (q) => {
        try {
            if (viewMode === 'available') {
                const params = q ? { search: q } : {};
                const { data } = await propertiesAPI.getAll(params);
                setProperties(data || []);
            } else {
                // Fetch active leases explicitly for the tenant
                const { data } = await leasesAPI.getAll();
                const leasedProps = data
                    .filter(l => l.status === 'active' && l.property)
                    .map(l => {
                        let props = l.property;
                        props.isAvailable = false; // Mark visual representation
                        return props;
                    });

                // Client-side search for Leased Props if search Query exists
                if (q) {
                    const lLower = q.toLowerCase();
                    setProperties(leasedProps.filter(p => p.title?.toLowerCase().includes(lLower) || p.address?.toLowerCase().includes(lLower)));
                } else {
                    setProperties(leasedProps);
                }
            }
        } catch (err) { console.log(err?.message); }
        finally { setLoading(false); setRefreshing(false); setSearching(false); }
    }, [viewMode]);

    useEffect(() => { load(search); }, [load]);

    const handleSearch = () => { setSearching(true); load(search); };

    const renderItem = ({ item }) => {
        const imgUri = item.images?.[0] ? `${BASE_URL}${item.images[0]}` : null;
        return (
            <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('PropertyDetail', { property: item })}>
                <Card style={styles.propCard} padding="none">
                    {imgUri ? (
                        <Image source={{ uri: imgUri }} style={styles.propImg} resizeMode="cover" />
                    ) : (
                        <View style={[styles.propImg, styles.noImg]}>
                            <Ionicons name="home" size={40} color={colors.outlineVariant} />
                        </View>
                    )}
                    {/* Price tag overlay */}
                    <View style={styles.priceTag}>
                        <Text style={styles.priceTagText}>{formatLKR(item.rentPerMonth)}/mo</Text>
                    </View>
                    <View style={styles.propBody}>
                        <Text style={styles.propTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={styles.ownerRow}>
                            <Ionicons name="person-circle-outline" size={14} color={colors.onSurfaceVariant} />
                            <Text style={styles.ownerText} numberOfLines={1}>by {item.owner?.name}</Text>
                        </View>
                        <View style={styles.locRow}>
                            <Ionicons name="location-outline" size={14} color={colors.primary} />
                            <Text style={styles.locText} numberOfLines={1}>{item.address}, {item.city}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <View style={styles.chip}><Ionicons name="bed-outline" size={12} color={colors.primary} /><Text style={styles.chipText}>{item.bedrooms} Beds</Text></View>
                            <View style={styles.chip}><Ionicons name="water-outline" size={12} color={colors.primary} /><Text style={styles.chipText}>{item.bathrooms} Baths</Text></View>
                            <View style={[styles.chip, { backgroundColor: item.isAvailable ? colors.secondaryContainer : colors.errorContainer }]}>
                                <Text style={[styles.chipText, { color: item.isAvailable ? colors.onSecondaryContainer : colors.onErrorContainer }]}>
                                    {item.isAvailable ? 'Available' : 'Rented'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Find Your Home</Text>
                <Text style={styles.headerSub}>{properties.length} properties available</Text>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color={colors.outline} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name, city, address..."
                        placeholderTextColor={colors.outline}
                        value={search}
                        onChangeText={setSearch}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearch(''); load(); }}>
                            <Ionicons name="close-circle" size={18} color={colors.outline} />
                        </TouchableOpacity>
                    )}
                    {searching && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} />}
                </View>

                <View style={{ flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm }}>
                    <TouchableOpacity style={[styles.toggleBtn, viewMode === 'available' && styles.toggleActive]} onPress={() => setViewMode('available')}>
                        <Text style={[styles.toggleText, viewMode === 'available' && styles.toggleTextActive]}>Available</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.toggleBtn, viewMode === 'leased' && styles.toggleActive]} onPress={() => setViewMode('leased')}>
                        <Text style={[styles.toggleText, viewMode === 'leased' && styles.toggleTextActive]}>My Leased</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <FlatList
                data={properties}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(search || undefined); }} colors={[colors.primary]} />}
                ListEmptyComponent={() => !loading && (
                    <View style={styles.empty}>
                        <Ionicons name="home-outline" size={64} color={colors.outlineVariant} />
                        <Text style={styles.emptyTitle}>No properties found</Text>
                        <Text style={styles.emptySub}>Try a different search term</Text>
                    </View>
                )}
            />
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
    headerSub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: spacing.sm },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: colors.surfaceContainer, borderRadius: 12,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    },
    searchInput: { flex: 1, ...typography.bodyMd, color: colors.onSurface },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 99, borderWidth: 1, borderColor: colors.outlineVariant },
    toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    toggleText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    toggleTextActive: { color: colors.onPrimary },
    list: { padding: spacing.margin, paddingBottom: 100 },
    propCard: { marginBottom: spacing.md, overflow: 'hidden', position: 'relative' },
    propImg: { width: '100%', height: 200, backgroundColor: colors.surfaceContainerLow },
    noImg: { alignItems: 'center', justifyContent: 'center' },
    priceTag: {
        position: 'absolute', top: spacing.sm, right: spacing.sm,
        backgroundColor: colors.primary, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5,
    },
    priceTagText: { ...typography.labelMd, color: colors.onPrimary, fontSize: 13 },
    propBody: { padding: spacing.md },
    propTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.xs },
    ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs },
    ownerText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
    locText: { ...typography.bodySm, color: colors.onSurface, flex: 1 },
    infoRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4,
        backgroundColor: colors.surfaceContainer, borderRadius: 99,
    },
    chipText: { ...typography.labelMd, color: colors.onSurface, fontSize: 11 },
    empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
    emptyTitle: { ...typography.h3, color: colors.onSurface },
    emptySub: { ...typography.bodyMd, color: colors.onSurfaceVariant },
});
