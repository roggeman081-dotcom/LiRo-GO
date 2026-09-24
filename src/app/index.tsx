import { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Menu, Mic, Plus } from "lucide-react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { JobCard } from "@/components/JobCard";
import { LiroLogo } from "@/components/LiroLogo";
import { StepIndicator } from "@/components/StepIndicator";
import { SyncBadge } from "@/components/SyncBadge";
import { TimeRing } from "@/components/TimeRing";
import { colors, spacing } from "@/theme";
import { getTodaysJobs } from "@/data/jobs";
import { JobWithCustomer } from "@/data/types";
import { seedDemoDataIfEmpty } from "@/data/seed";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useSyncStatus } from "@/sync/useSyncStatus";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - spacing.md;
const CARD_SPACING = spacing.md;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 10) return "God morgon";
  if (hour < 17) return "Hej";
  return "God kväll";
}

function formatDate(): string {
  const days = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];
  const months = [
    "januari", "februari", "mars", "april", "maj", "juni",
    "juli", "augusti", "september", "oktober", "november", "december",
  ];
  const now = new Date();
  return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state: syncState } = useSyncStatus();
  const timeTracking = useTimeTracking();
  const [jobs, setJobs] = useState<JobWithCustomer[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<JobWithCustomer>>(null);

  const load = useCallback(async () => {
    await seedDemoDataIfEmpty();
    const todays = await getTodaysJobs();
    setJobs(todays);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalSeconds = Math.floor(timeTracking.elapsedSeconds);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_SPACING));
    if (index !== activeIndex) setActiveIndex(index);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <LiroLogo size={28} />
        <SyncBadge state={syncState} />
      </View>

      <View style={styles.greetingBlock}>
        <AppText variant="caption" color={colors.textSecondary}>
          {formatDate()}
        </AppText>
        <AppText variant="title">{greeting()}, Rogge</AppText>
      </View>

      <View style={styles.ringWrapper}>
        <TimeRing
          progress={timeTracking.progress}
          hours={hours}
          minutes={minutes}
          seconds={seconds}
          isRunning={timeTracking.isRunning}
          onToggle={timeTracking.toggle}
        />
      </View>

      <View style={styles.jobsSection}>
        <View style={styles.jobsHeader}>
          <AppText variant="heading">Idag</AppText>
          {jobs.length > 1 && (
            <View style={{ width: 80 }}>
              <StepIndicator total={jobs.length} current={activeIndex} />
            </View>
          )}
        </View>

        {jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <AppText variant="body" color={colors.textSecondary}>
              Inga uppdrag idag. Skapa ett nytt för att komma igång.
            </AppText>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={jobs}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: CARD_SPACING }}
            onScroll={onScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <JobCard
                job={item}
                width={CARD_WIDTH}
                onPress={() => router.push(`/job/${item.id}`)}
              />
            )}
          />
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Button
            label="Nytt uppdrag"
            icon={<Plus size={18} color={colors.accentText} />}
            onPress={() => router.push("/new-job")}
          />
        </View>
        <IconButton accessibilityLabel="Diktera">
          <Mic size={20} color={colors.text} />
        </IconButton>
        <IconButton accessibilityLabel="Meny">
          <Menu size={20} color={colors.text} />
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  greetingBlock: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.xxs,
  },
  ringWrapper: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  jobsSection: {
    flex: 1,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  jobsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  emptyState: {
    paddingHorizontal: spacing.lg,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
