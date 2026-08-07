import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nManager, View } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/CartContext';
import { WishlistProvider } from '@/lib/WishlistContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function RootLayout() {
  useFrameworkReady();

  return (
    <View style={{ flex: 1, direction: 'rtl' }}>
      <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
      </ErrorBoundary>
    </View>
  );
}
