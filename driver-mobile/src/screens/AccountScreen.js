import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { driverAPI } from '../services/api';
import { Colors, Fonts, Shadows } from '../theme/ui';
import PageLoading from '../components/PageLoading';
import ScreenWrapper from '../components/ScreenWrapper';

export default function AccountScreen({ navigation }) {
    const [driverData, setDriverData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [monthlyScore, setMonthlyScore] = useState(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const dataStr = await AsyncStorage.getItem('driverData');
                if (dataStr) {
                    const parsed = JSON.parse(dataStr);
                    setDriverData(parsed);
                    if (parsed?._id) {
                        try {
                            const scoreRes = await driverAPI.getMonthlyScore(parsed._id);
                            setMonthlyScore(scoreRes.data?.score?.score ?? null);
                        } catch (e) {
                            console.error('Failed to load driver monthly score', e?.message || e);
                            setMonthlyScore(null);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to load profile", error);
                Alert.alert("Error", "Could not load driver profile.");
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        await AsyncStorage.clear();
                        // Access parent navigator to reset to Login
                        navigation.getParent()?.replace('Login');
                    }
                }
            ]
        );
    };

    if (loading) {
        return <PageLoading fullScreen />;
    }

    if (!driverData) {
        return (
            <View style={styles.centerContainer}>
                <Text>No driver data found.</Text>
            </View>
        );
    }

    return (
        <ScreenWrapper>
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                {/* Header / Avatar Area */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitials}>
                            {driverData.name ? driverData.name.charAt(0).toUpperCase() : 'D'}
                        </Text>
                    </View>
                    <Text style={styles.driverName}>{driverData.name}</Text>
                    <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>{driverData.experienceLevel || 'Junior'}</Text>
                    </View>
                </View>

                {/* Metrics */}
                <View style={styles.metricsContainer}>
                    <View style={styles.metricCard}>
                        <Ionicons name="trophy" size={24} color="#F59E0B" />
                        <Text style={styles.metricValue}>{monthlyScore == null ? '—' : monthlyScore}</Text>
                        <Text style={styles.metricLabel}>Driver Score (Monthly)</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Ionicons name="card" size={24} color="#3B82F6" />
                        <Text style={styles.metricValue}>{driverData.licenseNumber || 'N/A'}</Text>
                        <Text style={styles.metricLabel}>License</Text>
                    </View>
                </View>

                {/* Contact Details */}
                <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Contact Information</Text>

                    <View style={styles.detailRow}>
                        <View style={styles.iconBox}>
                            <Ionicons name="mail" size={20} color="#6B7280" />
                        </View>
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.detailLabel}>Email</Text>
                            <Text style={styles.detailValue}>{driverData.email}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.detailRow}>
                        <View style={styles.iconBox}>
                            <Ionicons name="call" size={20} color="#6B7280" />
                        </View>
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.detailLabel}>Phone Number</Text>
                            <Text style={styles.detailValue}>{driverData.contactNumber}</Text>
                        </View>
                    </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" style={styles.logoutIcon} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>SmartLogix Driver App v1.0.0</Text>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.bg,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarInitials: {
        fontSize: 32,
        fontFamily: Fonts.bold,
        color: '#4F46E5', // Indigo-600
    },
    driverName: {
        fontSize: 22,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
        marginBottom: 6,
    },
    badgeContainer: {
        backgroundColor: '#FEF3C7', // amber-100
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontFamily: Fonts.medium,
        color: '#D97706', // amber-600
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metricsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    metricCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginHorizontal: 6,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    metricValue: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
        marginTop: 8,
        marginBottom: 2,
    },
    metricLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontFamily: Fonts.medium,
    },
    detailsSection: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    detailTextContainer: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: Colors.textTertiary,
        fontFamily: Fonts.regular,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 15,
        color: Colors.textPrimary,
        fontFamily: Fonts.medium,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 16,
        marginLeft: 56, // Align with text
    },
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: '#FEF2F2', // red-50
        borderRadius: 12,
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FCA5A5', // red-300
        marginBottom: 24,
    },
    logoutIcon: {
        marginRight: 8,
    },
    logoutText: {
        color: '#EF4444', // red-500
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    versionText: {
        textAlign: 'center',
        color: Colors.textTertiary,
        fontFamily: Fonts.regular,
        fontSize: 12,
    }
});
