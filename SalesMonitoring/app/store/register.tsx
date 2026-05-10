import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Alert, ScrollView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { registerStore } from '../../utils/storage';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';

export default function RegisterStoreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera permission is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const fetchLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required.');
      return;
    }
    const location = await Location.getCurrentPositionAsync({});
    setCoords({
      lat: location.coords.latitude,
      lon: location.coords.longitude,
    });
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('Please enter a store name.');
      return;
    }
    if (!photo) {
      setErrorMsg('Please capture a photo of the store.');
      return;
    }
    if (!coords) {
      setErrorMsg('Please set the store location using GPS.');
      return;
    }

    setLoading(true);
    const store = await registerStore(name, coords.lat, coords.lon, photo, user?.nik);
    setLoading(false);

    if (store) {
      Alert.alert('Success', `Store "${store.name}" registered!`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      setErrorMsg('Failed to register store. Check your connection and try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Register New Store</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Store Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter store name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Store Photo</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={pickPhoto}>
            <Text style={styles.actionBtnIcon}>📷</Text>
            <Text style={styles.actionBtnText}>
              {photo ? 'Retake Photo' : 'Capture Photo'}
            </Text>
          </TouchableOpacity>
          {photo && (
            <Image source={{ uri: photo }} style={styles.preview} />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>GeoTag Location</Text>
          <TouchableOpacity
            style={[styles.actionBtn, coords && styles.actionBtnDone]}
            onPress={fetchLocation}
          >
            <Text style={styles.actionBtnIcon}>📍</Text>
            <Text style={styles.actionBtnText}>
              {coords
                ? `Location: ${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`
                : 'Use Current Location'}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0066cc" style={{ marginTop: 20 }} />
        ) : (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>Register Store</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    marginBottom: 10,
  },
  backText: {
    color: '#0066cc',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2d3748',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  section: {
    marginBottom: 20,
  },
  actionBtn: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#0066cc',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDone: {
    borderColor: '#28a745',
    backgroundColor: '#f0fff4',
  },
  actionBtnIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  actionBtnText: {
    color: '#0066cc',
    fontWeight: '600',
    fontSize: 16,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginTop: 12,
    resizeMode: 'cover',
  },
  submitBtn: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
});
