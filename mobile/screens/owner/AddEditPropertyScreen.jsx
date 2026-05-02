import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { propertiesAPI, BASE_URL } from '../../services/api';
import ScreenHeader from '../../components/ScreenHeader';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { colors, typography, spacing, radius } from '../../constants/theme';

const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'room', 'commercial'];
const AMENITIES_LIST = ['Parking', 'WiFi', 'Pool', 'Gym', 'Security', 'Balcony', 'Garden', 'AC', 'Generator'];

export default function AddEditPropertyScreen({ navigation, route }) {
    const editing = route?.params?.property;
    const [form, setForm] = useState({
        title: editing?.title || '',
        description: editing?.description || '',
        address: editing?.address || '',
        city: editing?.city || '',
        propertyType: editing?.propertyType || 'apartment',
        bedrooms: String(editing?.bedrooms ?? ''),
        bathrooms: String(editing?.bathrooms ?? ''),
        area: String(editing?.area ?? ''),
        rentPerMonth: String(editing?.rentPerMonth ?? ''),
        amenities: editing?.amenities || [],
    });
    const [images, setImages] = useState(
        editing?.images?.map(img => ({ uri: `${BASE_URL}${img}`, existing: true, path: img })) || []
    );
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const toggleAmenity = (a) => {
        setField('amenities', form.amenities.includes(a) ? form.amenities.filter(x => x !== a) : [...form.amenities, a]);
    };

    const pickImages = async () => {
        if (images.length >= 10) { Alert.alert('Limit', 'Maximum 10 images allowed'); return; }
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission', 'Gallery access required'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 10 - images.length,
            quality: 0.8,
        });
        if (!result.canceled && result.assets) {
            setImages(prev => [...prev, ...result.assets.map(a => ({ uri: a.uri, existing: false }))].slice(0, 10));
        }
    };

    const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));

    const validate = () => {
        const e = {};
        if (!form.title.trim()) e.title = 'Title required';
        if (!form.address.trim()) e.address = 'Address required';
        if (!form.city.trim()) e.city = 'City required';
        if (!form.rentPerMonth || isNaN(Number(form.rentPerMonth))) e.rentPerMonth = 'Valid rent amount required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (k === 'amenities') v.forEach(a => fd.append('amenities', a));
                else fd.append(k, v);
            });
            images.filter(img => !img.existing).forEach((img, i) => {
                fd.append('images', { uri: img.uri, type: 'image/jpeg', name: `image_${i}.jpg` });
            });

            if (editing) {
                await propertiesAPI.update(editing._id, fd);
                Alert.alert('Success', 'Property updated!');
            } else {
                await propertiesAPI.create(fd);
                Alert.alert('Success', 'Property listed successfully!');
            }
            navigation.goBack();
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to save property');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScreenHeader
                title={editing ? 'Edit Property' : 'New Property'}
                subtitle={editing ? 'Update your listing' : 'Add a new rental listing'}
                onBack={() => navigation.goBack()}
            />
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.section}>Property Details</Text>
                <Input label="Property Title*" placeholder="e.g. Modern 3BR Apartment in Colombo" value={form.title} onChangeText={v => setField('title', v)} error={errors.title} />
                <Input label="Description" placeholder="Describe your property..." value={form.description} onChangeText={v => setField('description', v)} multiline numberOfLines={4} />
                <Input label="Address*" placeholder="No. 12, Temple Road" value={form.address} onChangeText={v => setField('address', v)} error={errors.address} />
                <Input label="City*" placeholder="Colombo" value={form.city} onChangeText={v => setField('city', v)} error={errors.city} />

                <Text style={styles.section}>Property Type</Text>
                <View style={styles.typeRow}>
                    {PROPERTY_TYPES.map(t => (
                        <TouchableOpacity key={t} style={[styles.typeChip, form.propertyType === t && styles.typeChipActive]} onPress={() => setField('propertyType', t)}>
                            <Text style={[styles.typeText, form.propertyType === t && styles.typeTextActive]}>{t[0].toUpperCase() + t.slice(1)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.section}>Specs & Pricing</Text>
                <View style={styles.row}>
                    <Input label="Bedrooms" placeholder="3" value={form.bedrooms} onChangeText={v => setField('bedrooms', v)} keyboardType="numeric" style={styles.half} />
                    <Input label="Bathrooms" placeholder="2" value={form.bathrooms} onChangeText={v => setField('bathrooms', v)} keyboardType="numeric" style={styles.half} />
                </View>
                <View style={styles.row}>
                    <Input label="Area (sq ft)" placeholder="1200" value={form.area} onChangeText={v => setField('area', v)} keyboardType="numeric" style={styles.half} />
                    <Input label="Rent/Month (LKR)*" placeholder="50000" value={form.rentPerMonth} onChangeText={v => setField('rentPerMonth', v)} keyboardType="numeric" style={styles.half} error={errors.rentPerMonth} />
                </View>

                <Text style={styles.section}>Amenities</Text>
                <View style={styles.amenitiesGrid}>
                    {AMENITIES_LIST.map(a => (
                        <TouchableOpacity key={a} style={[styles.amenChip, form.amenities.includes(a) && styles.amenChipActive]} onPress={() => toggleAmenity(a)}>
                            {form.amenities.includes(a) && <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginRight: 4 }} />}
                            <Text style={[styles.amenText, form.amenities.includes(a) && styles.amenTextActive]}>{a}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.section}>Photos ({images.length}/10)</Text>
                <TouchableOpacity style={styles.uploadArea} onPress={pickImages}>
                    <Ionicons name="images-outline" size={28} color={colors.primary} />
                    <Text style={styles.uploadText}>Tap to select photos</Text>
                    <Text style={styles.uploadSub}>Up to 10 images</Text>
                </TouchableOpacity>
                {images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                        {images.map((img, i) => (
                            <View key={i} style={styles.imgThumb}>
                                <Image source={{ uri: img.uri }} style={styles.thumbImg} />
                                <TouchableOpacity style={styles.removeImg} onPress={() => removeImage(i)}>
                                    <Ionicons name="close-circle" size={20} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                )}

                <Button title={editing ? 'Update Property' : 'List Property'} onPress={handleSubmit} loading={loading} size="lg" style={{ marginTop: spacing.xl }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scroll: { padding: spacing.margin, paddingBottom: 60, backgroundColor: colors.background },
    section: { ...typography.h3, color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.sm },
    row: { flexDirection: 'row', gap: spacing.sm },
    half: { flex: 1 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: colors.outlineVariant },
    typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryFixed + '33' },
    typeText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    typeTextActive: { color: colors.primary },
    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    amenChip: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 99, borderWidth: 1.5, borderColor: colors.outlineVariant,
    },
    amenChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryFixed + '33' },
    amenText: { ...typography.labelMd, color: colors.onSurfaceVariant },
    amenTextActive: { color: colors.primary },
    uploadArea: {
        borderWidth: 2, borderColor: colors.outlineVariant, borderStyle: 'dashed',
        borderRadius: 12, alignItems: 'center', padding: spacing.xl, gap: spacing.xs,
    },
    uploadText: { ...typography.bodyMd, color: colors.primary },
    uploadSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
    imgThumb: { marginRight: spacing.sm, position: 'relative' },
    thumbImg: { width: 80, height: 80, borderRadius: 10, backgroundColor: colors.surfaceContainer },
    removeImg: { position: 'absolute', top: -6, right: -6 },
});
