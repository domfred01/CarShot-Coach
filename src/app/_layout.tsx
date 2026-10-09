import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={DarkTheme}>
      <AnimatedSplashOverlay />

      <Stack>
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="explore"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="shot-selection"
          options={{
            title: 'Choose Your Shot',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="shoot"
          options={{
               headerShown: false,
          }}
        />


      </Stack>
    </ThemeProvider>
  );
}