import { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import {
  useFonts,
  Barlow_100Thin,
  Barlow_300Light,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from "@expo-google-fonts/barlow";
import { colors } from "@/theme";
import { getDb } from "@/data/db";
import { OpeningScreen } from "@/features/opening/OpeningScreen";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Barlow_100Thin,
    Barlow_300Light,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
  });
  const [dbReady, setDbReady] = useState(false);
  const [showOpening, setShowOpening] = useState(true);

  useEffect(() => {
    getDb()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error("Failed to open database", err);
        setDbReady(true);
      });
  }, []);

  const ready = fontsLoaded && dbReady;

  const onLayoutRootView = useCallback(async () => {
    if (ready) {
      await SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.background }} onLayout={onLayoutRootView}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: "slide_from_right",
            }}
          />
          {showOpening && <OpeningScreen onFinish={() => setShowOpening(false)} />}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
