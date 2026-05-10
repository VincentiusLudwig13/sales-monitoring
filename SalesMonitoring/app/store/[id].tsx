import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Modal, Image, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import { getStores, saveVisit, getVisitsByStore, updateVisit, getProducts, API_BASE_URL } from '../../utils/storage';
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

  const [orderAmount, setOrderAmount] = useState('');
  const [returAmount, setReturAmount] = useState('');
  const [tagihanAmount, setTagihanAmount] = useState('');

  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [editForm, setEditForm] = useState({ order: '', retur: '', tagihan: '' });

  // Stock Management State
  const [products, setProducts] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'order' | 'retur'>('order');
  const [tempQuantities, setTempQuantities] = useState<Record<string, number>>({});

  // Attachment State
  const [attachment, setAttachment] = useState<string | null>(null);

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

  const pickImage = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setAttachment(result.assets[0].uri);
    }
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

    const success = await saveVisit(visit, attachment);
    if (success) {
      Alert.alert('Success', 'Visit recorded successfully!', [
        { text: 'OK', onPress: () => router.push('/dashboard') }
      ]);
    } else {
      Alert.alert('Error', 'Failed to save visit.');
    }
  };

  const handleOpenEdit = (v: any) => {
    setEditingVisit(v);
    setOrderItems(v.items || []);
    setReturnItems(v.returns || []);
    setEditForm({ 
      order: String(v.orderAmount), 
      retur: String(v.returAmount), 
      tagihan: String(v.tagihanAmount) 
    });
  };

  const handleCloseEdit = () => {
    setEditingVisit(null);
    setOrderItems([]);
    setReturnItems([]);
  };

  const handleSaveEdit = async () => {
    if (!editingVisit) return;

    const calculatedOrderTotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const calculatedReturTotal = returnItems.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.product_id);
      return sum + (item.quantity * (prod?.price || 0));
    }, 0);

    const updated = {
      ...editingVisit,
      orderAmount: calculatedOrderTotal,
      returAmount: calculatedReturTotal,
      tagihanAmount: Number(editForm.tagihan),
      items: orderItems,
      returns: returnItems
    };
    const success = await updateVisit(editingVisit.id, updated);
    if (success) {
      Alert.alert('Success', 'Transaction updated!');
      setEditingVisit(null);
      setOrderItems([]);
      setReturnItems([]);
      fetchStore();
    } else {
      Alert.alert('Error', 'Failed to update transaction.');
    }
  };

  const handleOpenProductModal = (type: 'order' | 'retur') => {
    setModalType(type);
    const initialQs: Record<string, number> = {};
    const currentItems = type === 'order' ? orderItems : returnItems;
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

  const handleApplyBulkSelection = () => {
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

    if (modalType === 'order') {
      setOrderItems(newItems);
    } else {
      setReturnItems(newItems);
    }
    setIsProductModalOpen(false);
  };

  const handleAddItem = (product: any) => {
    // Keep this for simple cases or just remove it if everything is bulk now
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
  };

  const removeItem = (productId: string, type: 'order' | 'retur') => {
    if (type === 'order') {
      setOrderItems(orderItems.filter(i => i.product_id !== productId));
    } else {
      setReturnItems(returnItems.filter(i => i.product_id !== productId));
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

  const formatCurrency = (amount: number) => 'Rp ' + (amount || 0).toLocaleString('id-ID');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Full Payment': return '#38a169';
      case 'Partial Payment': return '#3182ce';
      case 'Unpaid': return '#e53e3e';
      default: return '#718096';
    }
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
        {/* Store Photo */}
        {store.photo_url && (
          <View style={styles.photoContainer}>
            <Image 
              source={{ uri: `${API_BASE_URL}${store.photo_url}` }} 
              style={styles.storeImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Store Info Cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Hist. Sales</Text>
            <Text style={styles.infoValue}>{formatCurrency(store.historicalSales)}</Text>
          </View>
          <View style={[styles.infoCard, { borderLeftWidth: 4, borderLeftColor: '#38a169' }]}>
            <Text style={styles.infoLabel}>Net Sales</Text>
            <Text style={[styles.infoValue, { color: '#38a169' }]}>
              {formatCurrency((store.historicalSales || 0) - (store.historicalRetur || 0))}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Hist. Retur</Text>
            <Text style={styles.infoValue}>{formatCurrency(store.historicalRetur)}</Text>
          </View>
          <View style={[styles.infoCard, { borderLeftWidth: 4, borderLeftColor: '#f6ad55' }]}>
            <Text style={styles.infoLabel}>Retur Amount</Text>
            <Text style={[styles.infoValue, { color: '#dd6b20' }]}>{formatCurrency(store.historicalRetur)}</Text>
          </View>
          <View style={[styles.infoCard, styles.infoCardFull]}>
            <Text style={styles.infoLabel}>Outstanding Amount</Text>
            <Text style={[styles.infoValue, { color: '#e53e3e' }]}>{formatCurrency(store.outstanding)}</Text>
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
              const dueDate = v.dueDate ? new Date(v.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
              const isOverdue = v.dueDate && new Date(v.dueDate) < new Date();
              
              return (
                <View key={v.id || idx} style={styles.historyCard}>
                  <View style={styles.historyRow}>
                    <Text style={styles.historyDate}>{dateStr}</Text>
                    <TouchableOpacity onPress={() => handleOpenEdit(v)}>
                      <Text style={{ color: '#0066cc', fontWeight: 'bold' }}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.historyRow}>
                    <Text style={styles.historyTime}>{timeStr}</Text>
                    <View style={[styles.paymentBadge, { backgroundColor: getStatusColor(v.paymentStatus) }]}>
                      <Text style={styles.paymentBadgeText}>{v.paymentStatus || '-'}</Text>
                    </View>
                  </View>

                  <View style={[styles.historyRow, { marginTop: 8 }]}>
                    <Text style={styles.historyLabel}>📅 Due Date</Text>
                    <Text style={[styles.historyAmount, isOverdue && { color: '#e53e3e', fontWeight: '700' }]}>
                      {dueDate} {isOverdue ? '⚠️' : ''}
                    </Text>
                  </View>

                  <View style={[styles.historyRow, { borderTopWidth: 1, borderTopColor: '#edf2f7', paddingTop: 6, marginTop: 6 }]}>
                    <Text style={styles.historyLabel}>Order / Tagihan</Text>
                    <Text style={styles.historyAmount}>{formatCurrency(order)} / {formatCurrency(tagihan)}</Text>
                  </View>

                  <View style={[styles.historyRow, { marginTop: 4 }]}>
                    <Text style={[styles.historyLabel, { fontWeight: '700' }]}>Net Sales</Text>
                    <Text style={[styles.historyAmount, { fontWeight: '700', color: netSales >= 0 ? '#38a169' : '#e53e3e' }]}>
                      {formatCurrency(netSales)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Modal
          visible={!!editingVisit}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCloseEdit}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Transaction</Text>
              
              <ScrollView style={{ maxHeight: 400 }}>
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
                      onPress={() => { setModalType('order'); setIsProductModalOpen(true); }}
                    >
                      <Text style={styles.addItemBtnText}>+ ADD PRODUCT</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.totalText}>Total Order: {formatCurrency(Number(orderAmount))}</Text>
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
                      onPress={() => { setModalType('retur'); setIsProductModalOpen(true); }}
                    >
                      <Text style={styles.addItemBtnText}>+ ADD RETURN ITEM</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.totalText}>Total Return: {formatCurrency(Number(returAmount))}</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Tagihan / Collection</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.tagihan}
                    onChangeText={(t) => setEditForm({ ...editForm, tagihan: t })}
                    keyboardType="numeric"
                  />
                </View>
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

        {!isCheckedIn ? (
          <View style={styles.actionContainer}>
            <Text style={styles.instructionText}>You must check in within {CHECKIN_RADIUS} meters of the store location to input sales data.</Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={styles.mapContainer}>
              {Platform.OS === 'web' ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${store.lon - 0.001},${store.lat - 0.001},${store.lon + 0.001},${store.lat + 0.001}&layer=mapnik&marker=${store.lat},${store.lon}`}
                  style={{ border: 0, borderRadius: 12 }}
                />
              ) : (
                <MapView
                  style={{ flex: 1 }}
                  showsUserLocation={true}
                  showsMyLocationButton={true}
                  initialRegion={{
                    latitude: store.lat,
                    longitude: store.lon,
                    latitudeDelta: 0.002,
                    longitudeDelta: 0.002,
                  }}
                >
                  <Marker coordinate={{ latitude: store.lat, longitude: store.lon }} title={store.name} />
                  <Circle
                    center={{ latitude: store.lat, longitude: store.lon }}
                    radius={CHECKIN_RADIUS}
                    fillColor="rgba(0, 102, 204, 0.3)"
                    strokeColor="rgba(0, 102, 204, 0.8)"
                  />
                </MapView>
              )}
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

            <Text style={styles.formTitle}>Visit Activity</Text>

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
              <Text style={styles.totalText}>Total Order: {formatCurrency(Number(orderAmount))}</Text>
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
              <Text style={styles.totalText}>Total Return: {formatCurrency(Number(returAmount))}</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Tagihan / Collection (Rp)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#999"
                value={tagihanAmount}
                onChangeText={setTagihanAmount}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Document/Receipt Photo</Text>
              <TouchableOpacity style={styles.attachmentBtn} onPress={pickImage}>
                <Text style={styles.attachmentBtnText}>
                  {attachment ? '📸 Photo Captured' : '📷 Take Photo of Receipt'}
                </Text>
              </TouchableOpacity>
              {attachment && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: attachment }} style={styles.previewImage} />
                  <TouchableOpacity onPress={() => setAttachment(null)} style={styles.removeBtn}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#48bb78' }]} onPress={handleCheckout}>
              <Text style={styles.primaryBtnText}>CHECKOUT & SUBMIT</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  paymentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
  modalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
