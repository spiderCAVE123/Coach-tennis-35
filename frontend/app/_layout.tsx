import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider } from '../src/contexts/AuthContext';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import * as Font from 'expo-font';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    async function prepare() {
      try {
        // Preload fonts if needed
        // await Font.loadAsync({...});
        
        // Add any other initialization here
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
      </Stack>
    </AuthProvider>
  );
}