import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView, StyleSheet, View, Text, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import {
  AndroidOfflineSyncManager,
  KeyValueStorageAdapter,
  QueueSummary,
} from "./src/sync/offlineStore";
import {
  DEFAULT_SURVEY_SCHEMA,
  SurveySchema,
  SurveySubmissionPayload,
  ContactSubmissionPayload,
} from "./src/shared/contracts";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SurveyScreen } from "./src/screens/SurveyScreen";
import { ContactScreen } from "./src/screens/ContactScreen";

const asyncStorageAdapter: KeyValueStorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

// Fixed server URL injected exclusively from parent ../.env (SERVER_URL), defaulting to http://thecodersteam.com:3082
const FIXED_BACKEND_URL: string =
  process.env.EXPO_PUBLIC_SERVER_URL || "http://thecodersteam.com:3082";

export default function App() {
  const managerRef = useRef(
    new AndroidOfflineSyncManager({
      storage: asyncStorageAdapter,
      baseUrl: FIXED_BACKEND_URL,
    })
  );

  const [screen, setScreen] = useState<"home" | "survey" | "contact">("home");
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [schema, setSchema] = useState<SurveySchema>(DEFAULT_SURVEY_SCHEMA);
  const [defaultRegion, setDefaultRegion] = useState("");
  const [activeDraft, setActiveDraft] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [contactPrefillRegion, setContactPrefillRegion] = useState("");
  const [lastSyncBanner, setLastSyncBanner] = useState<string | null>(null);
  const [queueSummary, setQueueSummary] = useState<QueueSummary>({
    pendingResponsesCount: 0,
    inProgressDraftsCount: 0,
    completedPendingCount: 0,
    pendingContactsCount: 0,
    totalSyncedHistoryCount: 0,
    lastSyncedAt: null,
  });

  const refreshLocalState = async () => {
    const mgr = managerRef.current;
    const [summary, draft, cachedSchema] = await Promise.all([
      mgr.getQueueSummary(),
      mgr.loadActiveDraftState(),
      mgr.getCachedSchema(),
    ]);
    setQueueSummary(summary);
    setActiveDraft(draft);
    setSchema(cachedSchema);
  };

  const triggerAutoSync = async (showNotice = false) => {
    const mgr = managerRef.current;
    setIsSyncing(true);
    try {
      const [flushRes, remoteSchema] = await Promise.all([
        mgr.flushAllPendingWhenOnline(),
        mgr.fetchAndCacheRemoteSchema(),
      ]);
      setSchema(remoteSchema);
      await refreshLocalState();
      const total = flushRes.syncedResponses + flushRes.syncedContacts;
      if (total > 0 || showNotice) {
        setLastSyncBanner(
          total > 0
            ? `Se sincronizaron ${total} registro(s) con la nube.`
            : "Sincronización verificada al día."
        );
        setTimeout(() => setLastSyncBanner(null), 4500);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const mgr = managerRef.current;
    mgr.getFieldSettings().then((settings) => {
      setDefaultRegion(settings.defaultRegion);
      refreshLocalState();
      triggerAutoSync(false);
    });

    // Real-time NetInfo listener: automatically flushes offline queue when connectivity returns
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const connected = Boolean(
        state.isConnected && state.isInternetReachable !== false
      );
      setIsOnline(connected);
      if (connected) {
        triggerAutoSync(false);
      }
    });

    // Periodic background check every 45s while app is open
    const intervalId = setInterval(() => {
      triggerAutoSync(false);
    }, 45000);

    return () => {
      unsubscribeNet();
      clearInterval(intervalId);
    };
  }, []);

  const handleSaveSettings = async () => {
    const mgr = managerRef.current;
    await mgr.saveFieldSettings({
      defaultRegion,
    });
    await triggerAutoSync(true);
  };

  const handleSaveDraftAndSyncStep = async (
    draftState: Record<string, unknown>,
    payload: SurveySubmissionPayload
  ) => {
    const mgr = managerRef.current;
    await mgr.saveActiveDraftState(draftState);
    const res = await mgr.saveAndTrySyncResponse(payload);
    await refreshLocalState();
    return res;
  };

  const handleFinishSurvey = async (payload: SurveySubmissionPayload) => {
    const mgr = managerRef.current;
    await mgr.clearActiveDraftState();
    const res = await mgr.saveAndTrySyncResponse(payload);
    await refreshLocalState();
    return res;
  };

  const handleSaveContact = async (payload: ContactSubmissionPayload) => {
    const mgr = managerRef.current;
    const res = await mgr.saveAndTrySyncContact(payload);
    await refreshLocalState();
    return res;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="#3f5f61" />

      {/* Top Institutional App Bar */}
      <View style={styles.appBar}>
        <View style={styles.brandRow}>
          <Image
            source={require("./assets/icon.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.appBarTitle}>MOSAPRO</Text>
            <Text style={styles.appBarSub}>
              Movimiento Sanitario Provincial · App Relevamiento
            </Text>
          </View>
        </View>
      </View>

      {screen === "home" && (
        <HomeScreen
          isOnline={isOnline}
          isSyncing={isSyncing}
          queueSummary={queueSummary}
          hasActiveDraft={Boolean(activeDraft)}
          activeDraftStep={activeDraft?.currentStep as string | undefined}
          defaultRegion={defaultRegion}
          schemaVersion={schema.version}
          lastSyncBanner={lastSyncBanner}
          onChangeDefaultRegion={setDefaultRegion}
          onSaveSettings={handleSaveSettings}
          onManualSync={() => triggerAutoSync(true)}
          onStartNewSurvey={async () => {
            await managerRef.current.clearActiveDraftState();
            setActiveDraft(null);
            setScreen("survey");
          }}
          onResumeDraft={() => setScreen("survey")}
          onOpenContactForm={() => {
            setContactPrefillRegion(defaultRegion);
            setScreen("contact");
          }}
        />
      )}

      {screen === "survey" && (
        <SurveyScreen
          schema={schema}
          defaultRegion={defaultRegion}
          initialDraft={activeDraft}
          onSaveDraftAndSyncStep={handleSaveDraftAndSyncStep}
          onFinishSurvey={handleFinishSurvey}
          onExitToHome={async () => {
            await refreshLocalState();
            setScreen("home");
          }}
          onOpenUnlinkedContact={(reg) => {
            setContactPrefillRegion(reg || defaultRegion);
            setScreen("contact");
          }}
        />
      )}

      {screen === "contact" && (
        <ContactScreen
          themes={schema.themes}
          initialRegion={contactPrefillRegion}
          onSaveContact={handleSaveContact}
          onExitToHome={async () => {
            await refreshLocalState();
            setScreen("home");
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#567c7f",
  },
  appBar: {
    backgroundColor: "#567c7f",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ffffff",
  },
  appBarTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  appBarSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "600",
  },
});
