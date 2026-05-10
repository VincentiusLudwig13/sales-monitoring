import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Alert, ScrollView, Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
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
  const [photos, setPhotos] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  React.useEffect(() => {
    let watcher: Location.LocationSubscription;
    const startWatching = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        watcher = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 5 },
          (loc) => setUserLocation(loc)
        );
      }
    };
    startWatching();
    return () => watcher?.remove();
  }, []);

  const getLeafletHTML = () => {
    if (!coords) return '';
    const userLat = userLocation?.coords.latitude;
    const userLon = userLocation?.coords.longitude;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            #map { height: 100vh; width: 100vw; margin: 0; padding: 0; }
            .leaflet-control-attribution { display: none; }
            .user-location-dot {
              width: 12px;
              height: 12px;
              background-color: #007bff;
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 0 5px rgba(0,0,0,0.3);
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map', {zoomControl: false}).setView([${coords.lat}, ${coords.lon}], 18);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            
            // Tagged Marker
            L.marker([${coords.lat}, ${coords.lon}]).addTo(map).bindPopup('Store Location').openPopup();

            // User Live Location Dot
            if (${!!userLat && !!userLon}) {
              var userIcon = L.divIcon({
                className: 'user-location-dot',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
              });
              L.marker([${userLat || 0}, ${userLon || 0}], { icon: userIcon }).addTo(map);
              
              // Fit to show both
              var bounds = L.latLngBounds([[${coords.lat}, ${coords.lon}], [${userLat || 0}, ${userLon || 0}]]);
              map.fitBounds(bounds, { padding: [20, 20], maxZoom: 20 });
            }
          </script>
        </body>
      </html>
    `;
  };

  const handleAddPhoto = () => {
    Alert.alert(
      'Add Store Photo',
      'Select a source for your store photo',
      [
        {
          text: '📷 Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') return Alert.alert('Error', 'Camera permission required');
            let result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
            if (!result.canceled) setPhotos(prev => [...prev, result.assets[0].uri]);
          }
        },
        {
          text: '🖼️ Gallery',
          onPress: async () => {
            let result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, quality: 0.7 });
            if (!result.canceled) setPhotos(prev => [...prev, ...result.assets.map(a => a.uri)]);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
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
    if (photos.length === 0) {
      setErrorMsg('Please capture at least one photo of the store.');
      return;
    }
    if (!coords) {
      setErrorMsg('Please set the store location using GPS.');
      return;
    }

    setLoading(true);
    const store = await registerStore(name, coords.lat, coords.lon, photos, user?.nik);
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
          <Text style={styles.label}>Store Photos ({photos.length})</Text>
          <View style={styles.uploadZone}>
            <Text style={styles.uploadTitle}>Store Photos</Text>
            <TouchableOpacity 
              style={[styles.uploadBtn, { backgroundColor: '#0066cc', borderColor: '#0066cc' }]} 
              onPress={handleAddPhoto}
            >
              <Text style={[styles.uploadBtnIcon, { color: '#fff' }]}>+</Text>
              <Text style={[styles.uploadBtnText, { color: '#fff' }]}>ADD STORE PHOTO</Text>
            </TouchableOpacity>
          </View>
          
          {Array.isArray(photos) && photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 10 }}>
              {photos.map((uri, index) => (
                <View key={index} style={{ marginRight: 10, position: 'relative' }}>
                  <Image source={{ uri }} style={{ width: 100, height: 100, borderRadius: 12 }} />
                  <TouchableOpacity 
                    style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#e53e3e', borderRadius: 10, width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setPhotos(prev => prev.filter(p => p !== uri))}
                  >
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>GeoTag Location</Text>
          
          {coords && (
            <View style={styles.mapPreviewContainer}>
              <WebView
                originWhitelist={['*']}
                source={{ html: getLeafletHTML() }}
                style={{ flex: 1 }}
                scrollEnabled={false}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.geoBtn, coords && styles.geoBtnDone]}
            onPress={fetchLocation}
          >
            <View style={styles.geoBtnContent}>
              <Text style={styles.geoIcon}>📍</Text>
              <View>
                <Text style={[styles.geoText, coords && styles.geoTextDone]}>
                  {coords ? 'Location Captured' : 'Tap to Capture GPS'}
                </Text>
                {coords && (
                  <Text style={styles.geoCoords}>
                    {coords.lat.toFixed(6)}, {coords.lon.toFixed(6)}
                  </Text>
                )}
              </View>
            </View>
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
  uploadZone: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  uploadBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  uploadBtnIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  geoBtn: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#0066cc',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  geoBtnDone: {
    borderColor: '#28a745',
    backgroundColor: '#f0fff4',
  },
  geoBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  geoIcon: {
    fontSize: 24,
  },
  geoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0066cc',
  },
  geoTextDone: {
    color: '#28a745',
  },
  geoCoords: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  mapPreviewContainer: {
    width: '100%',
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  submitBtn: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
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
