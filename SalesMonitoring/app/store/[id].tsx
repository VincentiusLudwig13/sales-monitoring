import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Modal, Image, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';

let MapView: any = View;
let Marker: any = View;
let Circle: any = View;
let mapsAvailable = false;
try {
  const maps = require('react-native-maps');
  if (maps.default) MapView = maps.default;
  if (maps.Marker) Marker = maps.Marker;
  if (maps.Circle) Circle = maps.Circle;
  mapsAvailable = !!maps.default;
} catch (e) {
  // react-native-maps not available (e.g. Expo Go)
}
import { getStores, saveVisit, getVisitsByStore, updateVisit, getProducts, deleteAttachment, API_BASE_URL, SERVER_URL } from '../../utils/storage';
import { getDistanceInMeters } from '../../utils/location';
import { useAuth } from '../../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

const CHECKIN_RADIUS = Number(process.env.EXPO_PUBLIC_CHECKIN_RADIUS) || 10;

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [store, setStore] = useState<any>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [visitHistory, setVisitHistory] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  const [orderAmount, setOrderAmount] = useState('');
  const [returAmount, setReturAmount] = useState('');
  const [tagihanAmount, setTagihanAmount] = useState('');

  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [editForm, setEditForm] = useState({ order: '', retur: '', tagihan: '' });

  // Stock Management State
  const [products, setProducts] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [editOrderItems, setEditOrderItems] = useState<any[]>([]);
  const [editReturnItems, setEditReturnItems] = useState<any[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'order' | 'retur'>('order');
  const [tempQuantities, setTempQuantities] = useState<Record<string, number>>({});

  // Attachment State
  const [attachments, setAttachments] = useState<string[]>([]);
  const [editAttachments, setEditAttachments] = useState<string[]>([]);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const fetchStore = async () => {
    const stores = await getStores();
    const s = stores.find((st: any) => st.id === id);
    setStore(s);
    if (s) {
      const [visits, prods] = await Promise.all([getVisitsByStore(s.id), getProducts()]);
      setVisitHistory(visits.sort((a: any, b: any) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()));
      setProducts(prods);
    }
  };

  useEffect(() => {
    fetchStore();
  }, [id]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
      }
    })();
  }, []);

  const handleCheckIn = async () => {
    if (!store) return;
    setErrorMsg('');
    setIsCheckingIn(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setIsCheckingIn(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const distance = getDistanceInMeters(
        location.coords.latitude,
        location.coords.longitude,
        store.lat,
        store.lon
      );

      if (distance <= CHECKIN_RADIUS) {
        setIsCheckedIn(true);
        setCheckInTime(new Date().toISOString());
      } else {
        setErrorMsg(`Check-In Failed: You are ${distance.toFixed(2)} meters away. Must be within ${CHECKIN_RADIUS} meters.`);
      }
    } catch (e: any) {
      setErrorMsg('Error: Failed to get location. ' + e.message);
    }
    setIsCheckingIn(false);
  };

  const handleGetDirections = () => {
    if (!store) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lon}`;
    Linking.openURL(url).catch(err => Alert.alert('Error', 'Could not open Google Maps'));
  };

  const handleAddPhoto = (isEdit: boolean = false) => {
    Alert.alert(
      'Add Photo',
      'Select a source for your photo',
      [
        {
          text: '📷 Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') return Alert.alert('Error', 'Camera permission required');
            let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
            if (!result.canceled) {
              if (isEdit) setEditAttachments(prev => [...prev, result.assets[0].uri]);
              else setAttachments(prev => [...prev, result.assets[0].uri]);
            }
          }
        },
        {
          text: '🖼️ Gallery',
          onPress: async () => {
            let result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, quality: 0.7 });
            if (!result.canceled) {
              const uris = result.assets.map(a => a.uri);
              if (isEdit) setEditAttachments(prev => [...prev, ...uris]);
              else setAttachments(prev => [...prev, ...uris]);
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const removeAttachment = (uri: string) => {
    setAttachments(prev => prev.filter(u => u !== uri));
  };

  const handleCheckout = async () => {
    if (!store) return;
    // We can still allow manual input if desired, but let's prioritize items
    // If items exist, they overwrite the manual inputs in the backend anyway
    if (!tagihanAmount) {
      Alert.alert('Error', 'Please fill in tagihan amount (enter 0 if none)');
      return;
    }

    const calculatedOrderTotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const calculatedReturTotal = returnItems.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.product_id);
      return sum + (item.quantity * (prod?.price || 0));
    }, 0);

    const visit = {
      salesmanId: user?.nik,
      storeId: store.id,
      checkInTime,
      checkOutTime: new Date().toISOString(),
      orderAmount: calculatedOrderTotal,
      returAmount: calculatedReturTotal,
      tagihanAmount: Number(tagihanAmount),
      items: orderItems,
      returns: returnItems,
      status: 'pending'
    };

    const success = await saveVisit(visit, attachments);
    if (success) {
      Alert.alert('Success', 'Visit recorded successfully!', [
        { text: 'OK', onPress: () => router.push('/dashboard') }
      ]);
    } else {
      Alert.alert('Error', 'Failed to save visit.');
    }
  };

  const handleOpenEdit = async (v: any) => {
    try {
      // Check location for strict update
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const distance = getDistance(location.coords.latitude, location.coords.longitude, store.lat, store.lon);
      
      if (distance > 100) {
        Alert.alert(
          "Outside Radius",
          `You must be within 100m of the store to update this transaction. Current distance: ${Math.round(distance)}m`
        );
        return;
      }

      setEditingVisit(v);
      setEditOrderItems(v.items || []);
      setEditReturnItems(v.returns || []);
      setEditAttachments([]); 
      setEditForm({
        order: String(v.orderAmount),
        retur: String(v.returAmount),
        tagihan: String(v.tagihanAmount)
      });
    } catch (error) {
      Alert.alert("Location Error", "Could not verify your location. Please ensure GPS is active.");
    }
  };

  const handleCloseEdit = () => {
    setEditingVisit(null);
    setEditOrderItems([]);
    setEditReturnItems([]);
    setEditAttachments([]);
  };

  const handleSaveEdit = async () => {
    if (!editingVisit) return;

    const calculatedOrderTotal = editOrderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const calculatedReturTotal = editReturnItems.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.product_id);
      return sum + (item.quantity * (prod?.price || 0));
    }, 0);

    const updated = {
      ...editingVisit,
      orderAmount: calculatedOrderTotal,
      returAmount: calculatedReturTotal,
      tagihanAmount: Number(editForm.tagihan),
      items: editOrderItems,
      returns: editReturnItems
    };
    const success = await updateVisit(editingVisit.id, updated, editAttachments);
    if (success) {
      Alert.alert('Success', 'Transaction updated!');
      setEditingVisit(null);
      setEditAttachments([]);
      fetchStore();
    } else {
      Alert.alert('Error', 'Failed to update transaction.');
    }
  };

  const handleOpenProductModal = (type: 'order' | 'retur') => {
    setModalType(type);
    const initialQs: Record<string, number> = {};
    let currentItems: any[] = [];
    if (editingVisit) {
      currentItems = type === 'order' ? editOrderItems : editReturnItems;
    } else {
      currentItems = type === 'order' ? orderItems : returnItems;
    }
    products.forEach(p => {
      const existing = currentItems.find(i => i.product_id === p.id);
      initialQs[p.id] = existing ? existing.quantity : 0;
    });
    setTempQuantities(initialQs);
    setIsProductModalOpen(true);
  };

  const updateTempQuantity = (productId: string, delta: number) => {
    setTempQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + delta)
    }));
  };

  const handleDeleteExistingAttachment = (attId: number) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to permanently delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const success = await deleteAttachment(attId);
            if (success) {
              setEditingVisit((prev: any) => ({
                ...prev,
                attachments: prev.attachments.filter((a: any) => a.id !== attId)
              }));
              // Refresh visit history in background
              fetchStore();
            } else {
              Alert.alert('Error', 'Failed to delete photo.');
            }
          }
        }
      ]
    );
  };

  const handleApplyBulkSelection = () => {
    if (modalType === 'retur') {
      const invalidItems: string[] = [];
      Object.entries(tempQuantities).forEach(([pid, qty]) => {
        if (qty > 0) {
          const currentOrderItems = editingVisit ? editOrderItems : orderItems;
          const orderItem = currentOrderItems.find(i => i.product_id === pid);
          const orderQty = orderItem ? orderItem.quantity : 0;
          if (qty > orderQty) {
            const prod = products.find(p => p.id === pid);
            invalidItems.push(prod?.name || pid);
          }
        }
      });

      if (invalidItems.length > 0) {
        Alert.alert('Invalid Return', `Return quantity cannot be more than ordered quantity for: ${invalidItems.join(', ')}`);
        return;
      }
    }

    const newItems: any[] = [];
    Object.entries(tempQuantities).forEach(([pid, qty]) => {
      if (qty > 0) {
        const prod = products.find(p => p.id === pid);
        if (prod) {
          if (modalType === 'order') {
            newItems.push({ product_id: pid, name: prod.name, quantity: qty, price: prod.price });
          } else {
            newItems.push({ product_id: pid, name: prod.name, quantity: qty });
          }
        }
      }
    });

    if (editingVisit) {
      if (modalType === 'order') {
        setEditOrderItems(newItems);
      } else {
        setEditReturnItems(newItems);
      }
    } else {
      if (modalType === 'order') {
        setOrderItems(newItems);
      } else {
        setReturnItems(newItems);
      }
    }
    setIsProductModalOpen(false);
  };

  const handleAddItem = (product: any) => {
    if (editingVisit) {
      if (modalType === 'order') {
        const existing = editOrderItems.find(i => i.product_id === product.id);
        if (existing) {
          setEditOrderItems(editOrderItems.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
          setEditOrderItems([...editOrderItems, { product_id: product.id, name: product.name, quantity: 1, price: product.price }]);
        }
      } else {
        const existing = editReturnItems.find(i => i.product_id === product.id);
        if (existing) {
          setEditReturnItems(editReturnItems.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
          setEditReturnItems([...editReturnItems, { product_id: product.id, name: product.name, quantity: 1 }]);
        }
      }
    } else {
      if (modalType === 'order') {
        const existing = orderItems.find(i => i.product_id === product.id);
        if (existing) {
          setOrderItems(orderItems.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
          setOrderItems([...orderItems, { product_id: product.id, name: product.name, quantity: 1, price: product.price }]);
        }
      } else {
        const existing = returnItems.find(i => i.product_id === product.id);
        if (existing) {
          setReturnItems(returnItems.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
          setReturnItems([...returnItems, { product_id: product.id, name: product.name, quantity: 1 }]);
        }
      }
    }
  };

  const removeItem = (productId: string, type: 'order' | 'retur') => {
    if (editingVisit) {
      if (type === 'order') {
        setEditOrderItems(editOrderItems.filter(i => i.product_id !== productId));
      } else {
        setEditReturnItems(editReturnItems.filter(i => i.product_id !== productId));
      }
    } else {
      if (type === 'order') {
        setOrderItems(orderItems.filter(i => i.product_id !== productId));
      } else {
        setReturnItems(returnItems.filter(i => i.product_id !== productId));
      }
    }
  };

  useEffect(() => {
    const total = orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    setOrderAmount(String(total));
  }, [orderItems]);

  useEffect(() => {
    // For returns, we don't necessarily show the amount live if it's calculated backend,
    // but let's try to calculate it here too for UI consistency
    const total = returnItems.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.product_id);
      return sum + (item.quantity * (prod?.price || 0));
    }, 0);
    setReturAmount(String(total));
  }, [returnItems, products]);

  // Recalculate edit totals when edit items change
  useEffect(() => {
    if (!editingVisit) return;
    const total = editOrderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    setEditForm(prev => ({ ...prev, order: String(total) }));
  }, [editOrderItems]);

  useEffect(() => {
    if (!editingVisit) return;
    const total = editReturnItems.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.product_id);
      return sum + (item.quantity * (prod?.price || 0));
    }, 0);
    setEditForm(prev => ({ ...prev, retur: String(total) }));
  }, [editReturnItems, products]);

  const formatCurrency = (amount: number) => 'Rp ' + (amount || 0).toLocaleString('id-ID');
  
  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // in metres
  };

  const getLeafletHTML = () => {
    if (!store) return '';
    const userLat = userLocation?.coords.latitude;
    const userLon = userLocation?.coords.longitude;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; }
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
          const map = L.map('map', { zoomControl: false }).setView([${store.lat}, ${store.lon}], 18);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
          }).addTo(map);
          
          const storeIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
          });

          L.marker([${store.lat}, ${store.lon}], { icon: storeIcon }).addTo(map)
            .bindPopup('<b>${store.name}</b>')
            .openPopup();

          L.circle([${store.lat}, ${store.lon}], {
            color: '#0066cc',
            fillColor: '#0066cc',
            fillOpacity: 0.15,
            radius: ${CHECKIN_RADIUS}
          }).addTo(map);

          if (${!!userLat && !!userLon}) {
            const userIcon = L.divIcon({
              className: 'user-location-dot',
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            });
            L.marker([${userLat || 0}, ${userLon || 0}], { icon: userIcon }).addTo(map)
              .bindPopup('You are here');
            
            // Fit to show both user and store, including a bit of the radius
            const bounds = L.latLngBounds([
              [${store.lat}, ${store.lon}], 
              [${userLat || 0}, ${userLon || 0}]
            ]);
            // Also pad bounds with radius points to ensure circle is visible
            const radiusDeg = ${CHECKIN_RADIUS} / 111320; // rough estimate
            bounds.extend([${store.lat} + radiusDeg, ${store.lon} + radiusDeg]);
            bounds.extend([${store.lat} - radiusDeg, ${store.lon} - radiusDeg]);

            map.fitBounds(bounds, { padding: [20, 20], maxZoom: 20 });
          }
        </script>
      </body>
      </html>
    `;
  };

  const getStatusColor = (status: string) => {
    if (!status) return '#718096';
    const s = status.toLowerCase();
    if (s.includes('validated') || s.includes('full') || s.includes('paid')) return '#38a169'; // Green
    if (s.includes('partial') || s.includes('collection')) return '#3182ce'; // Blue
    if (s.includes('pending')) return '#f6ad55'; // Orange
    if (s.includes('unpaid') || s.includes('rejected')) return '#e53e3e'; // Red
    return '#718096';
  };

  if (!store) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0066cc" />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/stores')} style={styles.backBtn}>
          <Text style={styles.backText}>&larr; Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{store.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Store Stats Cards */}
        <View style={styles.infoGrid}>
          <View style={[styles.infoCard, { borderLeftWidth: 4, borderLeftColor: '#10b981' }]}>
            <Text style={styles.infoLabel}>Net Sales</Text>
            <Text style={[styles.infoValue, { color: '#059669' }]}>
              {formatCurrency(Number(orderAmount) - Number(returAmount))}
            </Text>
          </View>
          <View style={[styles.infoCard, { borderLeftWidth: 4, borderLeftColor: '#3b82f6' }]}>
            <Text style={styles.infoLabel}>Hist. Sales</Text>
            <Text style={[styles.infoValue, { color: '#1d4ed8' }]}>
              {formatCurrency(store.historicalSales)}
            </Text>
          </View>
          
          <View style={[styles.infoCard, { borderLeftWidth: 4, borderLeftColor: '#f59e0b' }]}>
            <Text style={styles.infoLabel}>Returns</Text>
            <Text style={[styles.infoValue, { color: '#d97706' }]}>{formatCurrency(Number(returAmount))}</Text>
          </View>
          <View style={[styles.infoCard, { borderLeftWidth: 4, borderLeftColor: '#ef4444' }]}>
            <Text style={styles.infoLabel}>Hist. Returns</Text>
            <Text style={[styles.infoValue, { color: '#b91c1c' }]}>{formatCurrency(store.historicalRetur)}</Text>
          </View>
          
          <View style={[styles.infoCard, styles.infoCardFull, { borderLeftColor: '#6366f1' }]}>
            <Text style={styles.infoLabel}>Outstanding Balance</Text>
            <Text style={[styles.infoValue, { color: '#4338ca', fontSize: 18 }]}>{formatCurrency(store.outstanding)}</Text>
          </View>
        </View>

        {/* Daily Visit History */}
        {visitHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>📋 Visit History</Text>
            {visitHistory.map((v: any, idx: number) => {
              const order = v.orderAmount || 0;
              const retur = v.returAmount || 0;
              const tagihan = v.tagihanAmount || 0;
              const netSales = order - retur;
              const date = new Date(v.checkInTime);
              const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
              const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

              return (
                <View key={v.id || idx} style={styles.historyCard}>
                  <View style={styles.historyRow}>
                    <View>
                      <Text style={styles.historyDate}>{dateStr}</Text>
                      <Text style={styles.historyTime}>
                        {timeStr} • {v.paymentStatus || 'No Transaction'}
                        {v.updated_at && <Text style={{ fontStyle: 'italic' }}> • Updated</Text>}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.paymentBadge, { backgroundColor: getStatusColor(v.paymentStatus || '') }]}>
                        <Text style={styles.paymentBadgeText}>{v.paymentStatus || 'N/A'}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleOpenEdit(v)}>
                        <Text style={styles.editLink}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.historyDivider} />

                  <View style={styles.historyDetails}>
                    <View style={styles.historyDetailRow}>
                      <Text style={styles.historyLabel}>Order Total</Text>
                      <Text style={styles.historyAmount}>{formatCurrency(order)}</Text>
                    </View>
                    <View style={styles.historyDetailRow}>
                      <Text style={styles.historyLabel}>Return Total</Text>
                      <Text style={[styles.historyAmount, { color: '#ef4444' }]}>-{formatCurrency(retur)}</Text>
                    </View>
                    <View style={styles.historyDetailRow}>
                      <Text style={styles.historyLabel}>Amount Collected</Text>
                      <Text style={[styles.historyAmount, { color: '#10b981' }]}>{formatCurrency(tagihan)}</Text>
                    </View>
                    
                    <View style={[styles.historyDetailRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' }]}>
                      <Text style={[styles.historyLabel, { fontWeight: '700', color: '#1e293b' }]}>NET SALES</Text>
                      <Text style={[styles.historyAmount, { fontWeight: '900', color: netSales >= 0 ? '#059669' : '#e53e3e', fontSize: 16 }]}>
                        {formatCurrency(netSales)}
                      </Text>
                    </View>
                  </View>

                  {v.attachments && v.attachments.length > 0 && (
                    <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8 }}>
                      <Text style={[styles.historyLabel, { marginBottom: 8 }]}>📷 Attachments ({v.attachments.length})</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                        {v.attachments.map((att: any) => (
                          <TouchableOpacity key={att.id} onPress={() => setFullScreenImage(`${SERVER_URL}${att.url}`)}>
                            <Image 
                              source={{ uri: `${SERVER_URL}${att.url}` }} 
                              style={{ width: 100, height: 100, borderRadius: 8, marginRight: 8, backgroundColor: '#f7fafc' }}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {!isCheckedIn ? (
          <View style={styles.actionContainer}>
            <Text style={styles.instructionText}>You must check in within {CHECKIN_RADIUS} meters of the store location to input sales data.</Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={styles.mapContainer}>
              <WebView
                originWhitelist={['*']}
                source={{ html: getLeafletHTML() }}
                style={{ flex: 1, borderRadius: 12 }}
                scrollEnabled={false}
              />
              <TouchableOpacity
                style={styles.mapsLinkOverlay}
                onPress={() => {
                  const url = Platform.select({
                    ios: `maps:0,0?q=${store.name}@${store.lat},${store.lon}`,
                    android: `geo:0,0?q=${store.lat},${store.lon}(${store.name})`,
                    web: `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lon}`
                  });
                  if (url) Linking.openURL(url);
                }}
              >
                <Text style={styles.mapsLinkOverlayText}>Open in Google Maps ↗</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, isCheckingIn && styles.disabledBtn]}
              onPress={handleCheckIn}
              disabled={isCheckingIn}
            >
              {isCheckingIn ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>CHECK IN NOW</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { marginTop: 12, backgroundColor: '#e2e8f0' }]}
              onPress={handleGetDirections}
            >
              <Text style={[styles.secondaryBtnText, { color: '#4a5568' }]}>📍 GET DIRECTIONS</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <View style={styles.checkedInBadge}>
              <Text style={styles.checkedInText}>✓ Checked In</Text>
            </View>

            <View style={styles.formHeaderRow}>
              <Text style={styles.formTitle}>Visit Activity</Text>
              <View style={styles.formTotals}>
                <Text style={styles.formTotalLabel}>Current Net: <Text style={styles.formTotalValue}>{formatCurrency(Number(orderAmount) - Number(returAmount))}</Text></Text>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Order Items</Text>
              <View style={styles.itemList}>
                {orderItems.map(item => (
                  <View key={item.product_id} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name} (x{item.quantity})</Text>
                    <TouchableOpacity onPress={() => removeItem(item.product_id, 'order')}>
                      <Text style={styles.removeTextSmall}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addItemBtn}
                  onPress={() => handleOpenProductModal('order')}
                >
                  <Text style={styles.addItemBtnText}>+ MANAGE ORDER ITEMS</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Return Items</Text>
              <View style={styles.itemList}>
                {returnItems.map(item => (
                  <View key={item.product_id} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name} (x{item.quantity})</Text>
                    <TouchableOpacity onPress={() => removeItem(item.product_id, 'retur')}>
                      <Text style={styles.removeTextSmall}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addItemBtn}
                  onPress={() => handleOpenProductModal('retur')}
                >
                  <Text style={styles.addItemBtnText}>+ MANAGE RETURN ITEMS</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.tagihanContainer}>
              <Text style={styles.tagihanLabel}>Amount Collected / Tagihan</Text>
              <View style={styles.tagihanInputWrapper}>
                <Text style={styles.currencyPrefix}>Rp</Text>
                <TextInput
                  style={styles.tagihanInput}
                  placeholder="0"
                  value={tagihanAmount}
                  onChangeText={setTagihanAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[styles.uploadZone, { marginTop: 20 }]}>
              <Text style={styles.uploadTitle}>Transaction Photos</Text>
              <View style={styles.uploadActions}>
                <TouchableOpacity 
                  style={[styles.uploadBtn, { backgroundColor: '#0066cc', borderColor: '#0066cc' }]} 
                  onPress={() => handleAddPhoto(false)}
                >
                  <Text style={[styles.uploadBtnIcon, { color: '#fff' }]}>+</Text>
                  <Text style={[styles.uploadBtnText, { color: '#fff' }]}>ADD PHOTO</Text>
                </TouchableOpacity>
              </View>

              {attachments.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.uploadPreviewList}>
                  {attachments.map((uri, index) => (
                    <View key={index} style={styles.uploadPreviewItem}>
                      <Image source={{ uri }} style={styles.uploadPreviewImage} />
                      <TouchableOpacity 
                        style={styles.uploadRemoveBtn}
                        onPress={() => removeAttachment(uri)}
                      >
                        <Text style={styles.uploadRemoveText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.uploadPlaceholder}>No photos added yet</Text>
              )}
            </View>

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#48bb78', marginTop: 20 }]} onPress={handleCheckout}>
              <Text style={styles.primaryBtnText}>CHECKOUT & SUBMIT</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modals moved outside ScrollView for better reliability */}
      <Modal
        visible={!!editingVisit}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Transaction</Text>

            <View style={styles.summaryEditRow}>
              <View style={styles.summaryEditItem}>
                <Text style={styles.summaryEditLabel}>ORDER TOTAL</Text>
                <Text style={styles.summaryEditValue}>{formatCurrency(Number(editForm.order))}</Text>
              </View>
              <View style={styles.summaryEditItem}>
                <Text style={styles.summaryEditLabel}>RETURN TOTAL</Text>
                <Text style={[styles.summaryEditValue, { color: '#e53e3e' }]}>{formatCurrency(Number(editForm.retur))}</Text>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Order Items</Text>
                <View style={styles.itemList}>
                  {editOrderItems.map(item => (
                    <View key={item.product_id} style={styles.itemRow}>
                      <Text style={styles.itemName}>{item.name} (x{item.quantity})</Text>
                      <TouchableOpacity onPress={() => removeItem(item.product_id, 'order')}>
                        <Text style={styles.removeTextSmall}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addItemBtn}
                    onPress={() => handleOpenProductModal('order')}
                  >
                    <Text style={styles.addItemBtnText}>+ ADD PRODUCT</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Return Items</Text>
                <View style={styles.itemList}>
                  {editReturnItems.map(item => (
                    <View key={item.product_id} style={styles.itemRow}>
                      <Text style={styles.itemName}>{item.name} (x{item.quantity})</Text>
                      <TouchableOpacity onPress={() => removeItem(item.product_id, 'retur')}>
                        <Text style={styles.removeTextSmall}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addItemBtn}
                    onPress={() => handleOpenProductModal('retur')}
                  >
                    <Text style={styles.addItemBtnText}>+ ADD RETURN ITEM</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.tagihanContainer}>
                <Text style={styles.tagihanLabel}>Amount Collected / Tagihan</Text>
                <View style={styles.tagihanInputWrapper}>
                  <Text style={styles.currencyPrefix}>Rp</Text>
                  <TextInput
                    style={styles.tagihanInput}
                    value={editForm.tagihan}
                    onChangeText={(t) => setEditForm({ ...editForm, tagihan: t })}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              </View>

              <View style={styles.uploadZone}>
                <Text style={styles.uploadTitle}>Transaction Photos</Text>
                <View style={styles.uploadActions}>
                  <TouchableOpacity 
                    style={[styles.uploadBtn, { backgroundColor: '#0066cc', borderColor: '#0066cc' }]} 
                    onPress={() => handleAddPhoto(true)}
                  >
                    <Text style={[styles.uploadBtnIcon, { color: '#fff' }]}>+</Text>
                    <Text style={[styles.uploadBtnText, { color: '#fff' }]}>ADD NEW PHOTO</Text>
                  </TouchableOpacity>
                </View>

                {editAttachments.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.uploadPreviewList}>
                    {editAttachments.map((uri, index) => (
                      <View key={index} style={styles.uploadPreviewItem}>
                        <Image source={{ uri }} style={styles.uploadPreviewImage} />
                        <TouchableOpacity 
                          style={styles.uploadRemoveBtn}
                          onPress={() => setEditAttachments(prev => prev.filter(u => u !== uri))}
                        >
                          <Text style={styles.uploadRemoveText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.uploadPlaceholder}>No new photos added yet</Text>
                )}
              </View>

              {editingVisit?.attachments && editingVisit.attachments.length > 0 && (
                <View>
                  <Text style={[styles.label, { fontSize: 12, marginTop: 10 }]}>Existing Photos (Tap to remove):</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                    {editingVisit.attachments.map((att: any) => (
                      <TouchableOpacity key={att.id} onPress={() => handleDeleteExistingAttachment(att.id)}>
                        <Image 
                          source={{ uri: `${SERVER_URL}${att.url}` }} 
                          style={{ width: 60, height: 60, borderRadius: 8, marginRight: 8 }} 
                        />
                        <View style={{ position: 'absolute', top: 0, right: 8, backgroundColor: 'rgba(229, 62, 62, 0.8)', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>×</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#e2e8f0' }]}
                onPress={handleCloseEdit}
              >
                <Text style={[styles.modalBtnText, { color: '#4a5568' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#0066cc' }]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Product Selection Modal */}
      <Modal
        visible={isProductModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsProductModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select {modalType === 'order' ? 'Product' : 'Return Item'}</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {products.map(p => {
                const qty = tempQuantities[p.id] || 0;
                return (
                  <View key={p.id} style={styles.productItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName}>{p.name}</Text>
                      <Text style={styles.productPrice}>{formatCurrency(p.price)}</Text>
                      <Text style={styles.productStock}>Avail: {p.quantity}</Text>
                    </View>

                    <View style={styles.qtySelector}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateTempQuantity(p.id, -1)}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{qty}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateTempQuantity(p.id, 1)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#e2e8f0', flex: 1 }]}
                onPress={() => setIsProductModalOpen(false)}
              >
                <Text style={[styles.modalBtnText, { color: '#4a5568', textAlign: 'center' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#0066cc', flex: 2 }]}
                onPress={handleApplyBulkSelection}
              >
                <Text style={[styles.modalBtnText, { textAlign: 'center' }]}>Update Selection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Screen Image Viewer */}
      <Modal
        visible={!!fullScreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }}
            onPress={() => setFullScreenImage(null)}
          >
            <Text style={{ color: 'white', fontSize: 40, fontWeight: '200' }}>×</Text>
          </TouchableOpacity>
          {fullScreenImage && (
            <Image 
              source={{ uri: fullScreenImage }} 
              style={{ width: '100%', height: '80%' }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  photoContainer: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#e2e8f0',
  },
  itemList: {
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 8,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  itemName: {
    fontSize: 14,
    color: '#2d3748',
  },
  removeTextSmall: {
    fontSize: 12,
    color: '#e53e3e',
    fontWeight: '600',
  },
  addItemBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  addItemBtnText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3748',
    textAlign: 'right',
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
  },
  productPrice: {
    fontSize: 14,
    color: '#718096',
  },
  productStock: {
    fontSize: 12,
    color: '#48bb78',
    fontWeight: 'bold',
  },
  qtySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f7fafc',
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qtyBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#fff',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 20,
    textAlign: 'center',
  },
  storeImage: {
    width: '100%',
    height: '100%',
  },
  attachmentBtn: {
    backgroundColor: '#edf2f7',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  attachmentBtnText: {
    color: '#4a5568',
    fontWeight: '600',
  },
  previewContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeBtn: {
    padding: 8,
  },
  removeText: {
    color: '#e53e3e',
    fontWeight: '600',
    fontSize: 12,
  },
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#0066cc',
  },
  backBtn: {
    marginBottom: 10,
  },
  backText: {
    color: '#e0f2fe',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 50,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCardFull: {
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#e53e3e',
  },
  infoLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  historyDetails: {
    marginTop: 4,
  },
  historyDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mapContainer: {
    width: '100%',
    height: 200,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  instructionText: {
    textAlign: 'center',
    color: '#4a5568',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: '#0066cc',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  secondaryBtn: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  checkedInBadge: {
    backgroundColor: '#c6f6d5',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  checkedInText: {
    color: '#276749',
    fontWeight: '600',
    fontSize: 12,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2d3748',
  },
  inputHint: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  errorBox: {
    backgroundColor: '#fed7d7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#e53e3e',
    width: '100%',
  },
  errorText: {
    color: '#c53030',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  historySection: {
    marginBottom: 24,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  historyTime: {
    fontSize: 12,
    color: '#a0aec0',
  },
  historyLabel: {
    fontSize: 13,
    color: '#718096',
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2d3748',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  tagihanContainer: {
    backgroundColor: '#ebf8ff',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#bee3f8',
  },
  tagihanLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2b6cb0',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagihanInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3182ce',
    paddingHorizontal: 16,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2b6cb0',
    marginRight: 8,
  },
  tagihanInput: {
    flex: 1,
    height: 54,
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
  },
  uploadZone: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  uploadActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  uploadBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 12,
    padding: 12,
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
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  uploadPlaceholder: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  uploadPreviewList: {
    flexDirection: 'row',
  },
  uploadPreviewItem: {
    marginRight: 12,
    position: 'relative',
  },
  uploadPreviewImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  uploadRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  uploadRemoveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  mapsLinkOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mapsLinkOverlayText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  summaryEditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f7fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryEditItem: {
    flex: 1,
  },
  summaryEditLabel: {
    fontSize: 10,
    color: '#718096',
    fontWeight: '700',
    marginBottom: 2,
  },
  summaryEditValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTotals: {
    alignItems: 'flex-end',
  },
  formTotalLabel: {
    fontSize: 12,
    color: '#718096',
  },
  formTotalValue: {
    fontWeight: 'bold',
    color: '#2d3748',
  },
  editLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  updatedText: {
    fontSize: 10,
    color: '#718096',
    fontStyle: 'italic',
  },
  auditLog: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#cbd5e0',
  },
  auditTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4a5568',
    marginBottom: 4,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  auditTime: {
    fontSize: 9,
    color: '#718096',
  },
  auditChange: {
    fontSize: 9,
    color: '#2d3748',
  },
  historyDivider: {
    height: 1,
    backgroundColor: '#edf2f7',
    marginVertical: 10,
  },
});
