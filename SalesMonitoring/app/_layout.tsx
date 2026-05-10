import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { initDummyData } from '../utils/storage';
import { View, Text, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setup = async () => {
      await initDummyData();
      setIsReady(true);
    };
    setup();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' }}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={{ marginTop: 10, color: '#333' }}>Initializing App...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="stores" />
        <Stack.Screen name="store/[id]" />
      </Stack>
    </AuthProvider>
  );
}
