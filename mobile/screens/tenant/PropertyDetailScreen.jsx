import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { propertiesAPI, BASE_URL } from '../../services/api';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { colors, typography, spacing, radius } from '../../constants/theme';

const { width } = Dimensions.get('window');
const formatLKR = (n) => `LKR ${Number(n || 0).toLocaleString()}`;

export default function PropertyDetailScreen({ navigation, route }) {
    const [property, setProperty] = useState(route?.params?.property || null);
    const [imgIndex, setImgIndex] = useState(0);

    const images = property?.images || [];
    const imgUris = images.map(i => `${BASE_URL}${i}`);

    return (
        <View style={styles.screen}>
            <ScreenHeader title={property?.title || 'Property Details'} onBack={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Image Carousel */}
                {imgUris.length > 0 ? (
                    <View style={styles.imgContainer}>
                        <ScrollView
                            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={e => setImgIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
                        >
                            {imgUris.map((uri, i) => (
                                <Image key={i} source={{ uri }} style={styles.propImg} resizeMode="cover" />
                            ))}
                        </ScrollView>
                        {imgUris.length > 1 && (
                            <View style={styles.pagination}>
                                {imgUris.map((_, i) => (
                                    <View key={i} style={[styles.dot, i === imgIndex && styles.dotActive]} />
                                ))}
                            </View>
                        )}
                        <View style={styles.priceTag}>
                            <Text style={styles.priceTagText}>{formatLKR(property?.rentPerMonth)}/mo</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.noImg}>
                        <Ionicons name="home" size={60} color={colors.outlineVariant} />
                    </View>
                )}

                {/* Main Info */}
                <View style={styles.content}>
                    <View style={styles.titleRow}>
                        <Text style={styles.propTitle}>{property?.title}</Text>
                        <Badge status={property?.isAvailable ? 'active' : 'rejected'} label={property?.isAvailable ? 'Available' : 'Rented'} />
                    </View>

                    <View style={styles.locRow}>
                        <Ionicons name="location" size={16} color={colors.primary} />
                        <Text style={styles.locText}>{property?.address}, {property?.city}</Text>
                    </View>

                    {/* Owner Card */}
                    <Card style={styles.ownerCard}>
                        <Text style={styles.sectionLabel}>Listed by</Text>
                        <View style={styles.ownerRow}>
                            <View style={styles.ownerAvatar}>
                                <Text style={styles.ownerAvatarText}>{(property?.owner?.name || 'O')[0].toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.ownerName}>{property?.owner?.name}</Text>
                                <Text style={styles.ownerContact}>{property?.owner?.email}</Text>
                                {property?.owner?.phone && <Text style={styles.ownerContact}>{property?.owner?.phone}</Text>}
                            </View>
                        </View>
                    </Card>

                    {/* Spec chips */}
                    <Text style={styles.sectionLabel}>Property Details</Text>
                    <View style={styles.specRow}>
                        <View style={styles.specChip}><Ionicons name="home" size={16} color={colors.primary} /><Text style={styles.specText}>{(property?.propertyType || 'apartment')[0].toUpperCase() + (property?.propertyType || '').slice(1)}</Text></View>
                        <View style={styles.specChip}><Ionicons name="bed" size={16} color={colors.primary} /><Text style={styles.specText}>{property?.bedrooms || 0} Bedrooms</Text></View>
                        <View style={styles.specChip}><Ionicons name="water" size={16} color={colors.primary} /><Text style={styles.specText}>{property?.bathrooms || 0} Bathrooms</Text></View>
                        {property?.area > 0 && <View style={styles.specChip}><Ionicons name="resize" size={16} color={colors.primary} /><Text style={styles.specText}>{property.area} sq ft</Text></View>}
                    </View>

                    {/* Description */}
                    {property?.description && (
                        <>
                            <Text style={styles.sectionLabel}>About</Text>
                            <Text style={styles.description}>{property.description}</Text>
                        </>
                    )}

                    {/* Amenities */}
                    {property?.amenities?.length > 0 && (
                        <>
                            <Text style={styles.sectionLabel}>Amenities</Text>
                            <View style={styles.amenitiesRow}>
                                {property.amenities.map(a => (
                                    <View key={a} style={styles.amenChip}>
                                        <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                                        <Text style={styles.amenText}>{a}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Appointment Notice */}
                    <Card style={styles.noticeCard} variant="filled">
                        <View style={styles.noticeRow}>
                            <Ionicons name="information-circle" size={20} color={colors.primary} />
                            <Text style={styles.noticeText}>
                                Please call the property owner to confirm a suitable date, time and location before scheduling your appointment.
                            </Text>
                        </View>
                    </Card>
                </View>
            </ScrollView>

            {/* Bottom CTA */}
            {property?.isAvailable && (
                <View style={[styles.bottomBar, { flexDirection: 'column', alignItems: 'stretch' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                        <View>
                            <Text style={styles.bottomPrice}>{formatLKR(property?.rentPerMonth)}</Text>
                            <Text style={styles.bottomPriceSub}>per month</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <Button
                            title="Visit"
                            variant="outline"
                            onPress={() => navigation.navigate('ScheduleAppointment', { property })}
                            style={{ flex: 1 }}
                            icon={<Ionicons name="calendar-outline" size={18} color={colors.primary} />}
                        />
                        <Button
                            title="Request Lease"
                            onPress={() => navigation.navigate('RequestLease', { property })}
                            style={{ flex: 1.5 }}
                            icon={<Ionicons name="document-text" size={18} color={colors.onPrimary} />}
                        />
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingBottom: 100 },
    imgContainer: { position: 'relative' },
    propImg: { width, height: 280 },
    noImg: { width: '100%', height: 200, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
    pagination: { flexDirection: 'row', justifyContent: 'center', gap: 6, position: 'absolute', bottom: 12, alignSelf: 'center' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
    dotActive: { backgroundColor: colors.onPrimary, width: 16 },
    priceTag: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: colors.primary, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6 },
    priceTagText: { ...typography.labelMd, color: colors.onPrimary, fontSize: 14 },
    content: { padding: spacing.margin },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm },
    propTitle: { ...typography.h2, color: colors.onSurface, flex: 1 },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.lg },
    locText: { ...typography.bodyMd, color: colors.onSurfaceVariant, flex: 1 },
    ownerCard: { marginBottom: spacing.lg, padding: spacing.md },
    ownerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
    ownerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    ownerAvatarText: { ...typography.h3, color: colors.onPrimary },
    ownerName: { ...typography.h3, fontSize: 15, color: colors.onSurface },
    ownerContact: { ...typography.bodySm, color: colors.onSurfaceVariant },
    sectionLabel: { ...typography.labelMd, color: colors.onSurfaceVariant, letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.sm },
    specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    specChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceContainer, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
    specText: { ...typography.bodyMd, color: colors.onSurface, fontSize: 14 },
    description: { ...typography.bodyMd, color: colors.onSurface, lineHeight: 24, marginBottom: spacing.md },
    amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    amenChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryFixed + '33', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
    amenText: { ...typography.bodySm, color: colors.primary },
    noticeCard: { marginTop: spacing.sm },
    noticeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    noticeText: { ...typography.bodySm, color: colors.onSurface, flex: 1, lineHeight: 20 },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.surfaceContainerLowest,
        borderTopWidth: 1, borderTopColor: colors.outlineVariant,
        padding: spacing.margin, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    },
    bottomPrice: { ...typography.h3, color: colors.primary },
    bottomPriceSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
    apptBtn: { flex: 1 },
});
