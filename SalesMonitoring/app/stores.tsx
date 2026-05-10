import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { getStores } from '../utils/storage';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';

export default function StoresScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [filteredStores, setFilteredStores] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchStores = async () => {
        setIsLoading(true);
        try {
          const data = await getStores();
          const myStores = data.filter((s: any) => s.salesmanId === user?.nik);
          setStores(myStores);
          setFilteredStores(myStores);
          setSearch('');
        } finally {
          setIsLoading(false);
        }
      };
      fetchStores();
    }, [user])
  );

  const handleSearch = (text: string) => {
    setSearch(text);
    if (text) {
      setFilteredStores(stores.filter((s: any) => s.name.toLowerCase().includes(text.toLowerCase())));
    } else {
      setFilteredStores(stores);
    }
  };

  const formatCurrency = (amount: number) => 'Rp ' + (amount || 0).toLocaleString('id-ID');

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.storeCard} 
      onPress={() => router.push(`/store/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.storeName}>{item.name}</Text>
        <Text style={styles.storeDistance}>Select &gt;</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.storeInfo}>Outstanding: <Text style={styles.highlightInfo}>{formatCurrency(item.outstanding)}</Text></Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/dashboard')} style={styles.backBtn}>
          <Text style={styles.backText}>&larr; Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Select Store to Visit</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Search stores..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={{ marginTop: 10, color: '#718096' }}>Loading stores...</Text>
        </View>
      ) : (
        <FlatList 
          data={filteredStores}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No stores found. Tap + to register one.</Text>}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/store/register')}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
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
  searchContainer: {
    padding: 24,
  },
  searchInput: {
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
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
  },
  storeDistance: {
    fontSize: 14,
    color: '#0066cc',
    fontWeight: '600',
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
    paddingTop: 12,
  },
  storeInfo: {
    fontSize: 14,
    color: '#718096',
  },
  highlightInfo: {
    color: '#e53e3e',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#a0aec0',
    marginTop: 40,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 40,
    backgroundColor: '#0066cc',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '300',
  },
});
