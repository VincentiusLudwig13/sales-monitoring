import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getVisits } from '../utils/storage';
import { StatusBar } from 'expo-status-bar';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [salesNetMTD, setSalesNetMTD] = useState(0);
  const [salesToday, setSalesToday] = useState(0);
  const [returMTD, setReturMTD] = useState(0);
  const [budgetReturMTD, setBudgetReturMTD] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const fetchStats = async () => {
        const visits = await getVisits();
        const myVisits = visits.filter((v: any) => v.salesmanId === user?.nik);

        let mtdNetSales = 0;
        let todaySales = 0;
        let mtdRetur = 0;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const todayStr = now.toDateString();

        myVisits.forEach((v: any) => {
          const order = v.orderAmount || v.salesAmount || 0;
          const retur = v.returAmount || 0;
          const net = order - retur;

          const visitDate = new Date(v.checkInTime);
          const isThisMonth = visitDate.getMonth() === currentMonth && visitDate.getFullYear() === currentYear;
          const isToday = visitDate.toDateString() === todayStr;

          // MTD only counts validated visits
          if (isThisMonth && v.status === 'validated') {
            mtdNetSales += net;
            mtdRetur += retur;
          }

          // Today counts everything (even pending) to show daily progress
          if (isToday) {
            todaySales += net;
          }
        });

        setSalesNetMTD(mtdNetSales);
        setSalesToday(todaySales);
        setReturMTD(mtdRetur);
        setBudgetReturMTD(mtdNetSales * 0.01);
      };

      fetchStats();
    }, [user])
  );

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const formatCurrency = (amount: number) => {
    return 'Rp ' + amount.toLocaleString('id-ID');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name}</Text>
          <Text style={styles.date}>{new Date().toDateString()}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sales Net MTD</Text>
          <Text style={styles.cardAmount}>{formatCurrency(salesNetMTD)}</Text>
          <Text style={styles.cardSubtext}>Month-To-Date (Validated Only)</Text>
        </View>

        <View style={[styles.card, { backgroundColor: '#4a5568', shadowColor: '#4a5568' }]}>
          <Text style={styles.cardTitle}>Sales Net Today</Text>
          <Text style={styles.cardAmount}>{formatCurrency(salesToday)}</Text>
          <Text style={styles.cardSubtext}>Daily Performance (Includes Pending)</Text>
        </View>

        <View style={styles.gridContainer}>
          <View style={[styles.miniCard, { backgroundColor: '#3182ce' }]}>
            <Text style={styles.miniCardTitle}>Budget Retur MTD</Text>
            <Text style={styles.miniCardAmount}>{formatCurrency(budgetReturMTD)}</Text>
            <Text style={styles.miniCardSubtext}>1% of Sales MTD</Text>
          </View>
          <View style={[styles.miniCard, { backgroundColor: returMTD > budgetReturMTD ? '#e53e3e' : '#38a169' }]}>
            <Text style={styles.miniCardTitle}>Retur MTD</Text>
            <Text style={styles.miniCardAmount}>{formatCurrency(returMTD)}</Text>
            <Text style={styles.miniCardSubtext}>{returMTD > budgetReturMTD ? 'Over Budget ⚠️' : 'Within Budget ✓'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.activityBtn}
          onPress={() => router.push('/stores')}
        >
          <Text style={styles.activityBtnText}>Start Activity</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  date: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
  },
  logoutBtn: {
    padding: 8,
  },
  logoutText: {
    color: '#e53e3e',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 24,
  },
  card: {
    backgroundColor: '#0066cc',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#0066cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardSecondary: {
    backgroundColor: '#2d3748',
    shadowColor: '#2d3748',
  },
  cardTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  cardAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  cardSubtext: {
    color: '#cbd5e0',
    fontSize: 12,
    marginTop: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  miniCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  miniCardTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  miniCardAmount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  miniCardSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: 4,
  },
  activityBtn: {
    backgroundColor: '#48bb78',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#48bb78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  activityBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
