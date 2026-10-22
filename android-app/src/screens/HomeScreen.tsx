import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { REGIONES_SANITARIAS } from "../shared/contracts";
import type { QueueSummary } from "../sync/offlineStore";

interface HomeScreenProps {
  isOnline: boolean;
  isSyncing: boolean;
  queueSummary: QueueSummary;
  hasActiveDraft: boolean;
  activeDraftStep?: string;
  apiBaseUrl: string;
  defaultRegion: string;
  schemaVersion: number;
  lastSyncBanner: string | null;
  onChangeApiBaseUrl: (url: string) => void;
  onChangeDefaultRegion: (region: string) => void;
  onSaveSettings: () => void;
  onManualSync: () => void;
  onStartNewSurvey: () => void;
  onResumeDraft: () => void;
  onOpenContactForm: () => void;
}

export function HomeScreen({
  isOnline,
  isSyncing,
  queueSummary,
  hasActiveDraft,
  activeDraftStep,
  apiBaseUrl,
  defaultRegion,
  schemaVersion,
  lastSyncBanner,
  onChangeApiBaseUrl,
  onChangeDefaultRegion,
  onSaveSettings,
  onManualSync,
  onStartNewSurvey,
  onResumeDraft,
  onOpenContactForm,
}: HomeScreenProps) {
  const totalPending =
    queueSummary.pendingResponsesCount + queueSummary.pendingContactsCount;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Top Status Banner */}
      <View style={styles.heroCard}>
        <View style={styles.badgeRow}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              MODO RELEVADOR EN TERRENO · ANDROID
            </Text>
          </View>
          <View
            style={[
              styles.connBadge,
              isOnline ? styles.connOnline : styles.connOffline,
            ]}
          >
            <Text style={styles.connBadgeText}>
              {isOnline ? "● Conectado (Auto-Sync)" : "○ Offline (Cola Local)"}
            </Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>MOSAPRO — Relevamiento Sanitario</Text>
        <Text style={styles.heroSubtitle}>
          Las respuestas se guardan paso a paso en el dispositivo y se sincronizan automáticamente en segundo plano apenas haya señal.
        </Text>
      </View>

      {lastSyncBanner && (
        <View style={styles.syncNotice}>
          <Text style={styles.syncNoticeText}>✓ {lastSyncBanner}</Text>
        </View>
      )}

      {/* Primary Actions */}
      <View style={styles.actionsCard}>
        {hasActiveDraft && (
          <Pressable
            onPress={onResumeDraft}
            style={({ pressed }) => [
              styles.resumeBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.resumeBtnTitle}>
              ▶ Continuar encuesta en curso ({activeDraftStep || "En progreso"})
            </Text>
            <Text style={styles.resumeBtnSub}>
              Retomá desde el último paso guardado en este dispositivo
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={onStartNewSurvey}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.primaryBtnText}>
            + Iniciar Nueva Encuesta Anónima
          </Text>
        </Pressable>

        <Pressable
          onPress={onOpenContactForm}
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.secondaryBtnText}>
            Sumar Contacto a Mesa de Trabajo (Desvinculado)
          </Text>
        </Pressable>
      </View>

      {/* Offline Queue & Sync Tray */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            Bandeja de Sincronización Offline
          </Text>
          <Text style={styles.versionTag}>Esquema v{schemaVersion}</Text>
        </View>

        <View style={styles.kpiGrid}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiNumber}>
              {queueSummary.completedPendingCount}
            </Text>
            <Text style={styles.kpiLabel}>Completas por subir</Text>
          </View>

          <View style={styles.kpiBox}>
            <Text style={styles.kpiNumber}>
              {queueSummary.inProgressDraftsCount}
            </Text>
            <Text style={styles.kpiLabel}>En curso guardadas</Text>
          </View>

          <View style={styles.kpiBox}>
            <Text style={styles.kpiNumber}>
              {queueSummary.pendingContactsCount}
            </Text>
            <Text style={styles.kpiLabel}>Contactos por subir</Text>
          </View>

          <View style={styles.kpiBox}>
            <Text style={[styles.kpiNumber, { color: "#15803d" }]}>
              {queueSummary.totalSyncedHistoryCount}
            </Text>
            <Text style={styles.kpiLabel}>Subidas a la nube</Text>
          </View>
        </View>

        <Pressable
          onPress={onManualSync}
          disabled={isSyncing}
          style={({ pressed }) => [
            styles.syncNowBtn,
            (pressed || isSyncing) && styles.btnPressed,
          ]}
        >
          {isSyncing ? (
            <View style={styles.rowCenter}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.syncNowBtnText}>
                {"  "}Sincronizando con el servidor...
              </Text>
            </View>
          ) : (
            <Text style={styles.syncNowBtnText}>
              ↻ Sincronizar ahora ({totalPending} pendiente
              {totalPending === 1 ? "" : "s"}) + Actualizar preguntas
            </Text>
          )}
        </Pressable>
      </View>

      {/* Surveyor Territory & Server Configuration */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          Configuración de Operativo / Región por Defecto
        </Text>
        <Text style={styles.helperText}>
          Si estás relevando en una Región Sanitaria específica, podés dejarla preseleccionada para agilizar cada encuesta:
        </Text>

        <View style={styles.regionChipsWrap}>
          <Pressable
            onPress={() => onChangeDefaultRegion("")}
            style={[
              styles.regionChip,
              defaultRegion === "" && styles.regionChipActive,
            ]}
          >
            <Text
              style={[
                styles.regionChipText,
                defaultRegion === "" && styles.regionChipTextActive,
              ]}
            >
              Todas
            </Text>
          </Pressable>
          {REGIONES_SANITARIAS.map((r) => {
            const active = defaultRegion === r.code;
            return (
              <Pressable
                key={r.code}
                onPress={() => onChangeDefaultRegion(r.code)}
                style={[
                  styles.regionChip,
                  active && styles.regionChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.regionChipText,
                    active && styles.regionChipTextActive,
                  ]}
                >
                  Reg. {r.code}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { marginTop: 14 }]}>
          URL del Servidor Backend (Puerto 3082 por defecto):
        </Text>
        <TextInput
          value={apiBaseUrl}
          onChangeText={onChangeApiBaseUrl}
          placeholder="http://192.168.1.100:3082 o https://encuesta.mosapro.com.ar"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <Pressable
          onPress={onSaveSettings}
          style={({ pressed }) => [
            styles.saveConfigBtn,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.saveConfigBtnText}>
            Guardar configuración del dispositivo
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f6f7" },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  heroCard: {
    backgroundColor: "#567c7f",
    borderRadius: 16,
    padding: 18,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: "#b99e93",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  roleBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  connBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  connOnline: { backgroundColor: "rgba(16, 185, 129, 0.28)" },
  connOffline: { backgroundColor: "rgba(245, 158, 11, 0.35)" },
  connBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    lineHeight: 19,
  },
  syncNotice: {
    backgroundColor: "#ecfdf5",
    borderColor: "#6ee7b7",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  syncNoticeText: {
    color: "#065f46",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  actionsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e6e9",
    gap: 10,
  },
  resumeBtn: {
    backgroundColor: "#f3f1ee",
    borderWidth: 2,
    borderColor: "#567c7f",
    borderRadius: 12,
    padding: 14,
  },
  resumeBtnTitle: {
    color: "#3f5f61",
    fontSize: 15,
    fontWeight: "800",
  },
  resumeBtnSub: {
    color: "#5a4f49",
    fontSize: 12,
    marginTop: 2,
  },
  primaryBtn: {
    backgroundColor: "#567c7f",
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#567c7f",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#567c7f",
    fontSize: 13,
    fontWeight: "700",
  },
  btnPressed: { opacity: 0.8 },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e6e9",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#567c7f",
    fontSize: 16,
    fontWeight: "800",
  },
  versionTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  kpiBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f3f6f7",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e6e9",
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: "#567c7f",
  },
  kpiLabel: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
    marginTop: 2,
  },
  syncNowBtn: {
    backgroundColor: "#b99e93",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  syncNowBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  helperText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 10,
  },
  regionChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  regionChip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  regionChipActive: {
    backgroundColor: "#567c7f",
    borderColor: "#567c7f",
  },
  regionChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  regionChipTextActive: {
    color: "#ffffff",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    backgroundColor: "#ffffff",
    color: "#1e293b",
  },
  saveConfigBtn: {
    marginTop: 12,
    backgroundColor: "#3f5f61",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  saveConfigBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
