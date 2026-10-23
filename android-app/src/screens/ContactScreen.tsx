import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
} from "react-native";
import { randomUUID } from "expo-crypto";
import {
  REGIONES_SANITARIAS,
  MUNICIPIOS_PBA,
  getMunicipiosByRegion,
  validateContactSubmission,
  SurveyTheme,
  ContactSubmissionPayload,
} from "../shared/contracts";

function makeContactUuid(): string {
  // Cryptographically secure UUID (expo-crypto); the `cnt_and_` prefix stays
  // valid for storage keys (alphanumeric, `.`, `-`, `_`).
  return `cnt_and_${randomUUID()}`;
}

interface ContactScreenProps {
  themes: SurveyTheme[];
  initialRegion?: string;
  onSaveContact: (
    payload: ContactSubmissionPayload
  ) => Promise<{ syncedNow: boolean }>;
  onExitToHome: () => void;
}

export function ContactScreen({
  themes,
  initialRegion = "",
  onSaveContact,
  onExitToHome,
}: ContactScreenProps) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [regionSanitaria, setRegionSanitaria] = useState(initialRegion);
  const [municipio, setMunicipio] = useState("");
  const [organizacionOEspacio, setOrganizacionOEspacio] = useState("");
  const [tematicasInteres, setTematicasInteres] = useState<string[]>([]);
  const [ofreceReferente, setOfreceReferente] = useState(false);
  const [comentarios, setComentarios] = useState("");

  const [errors, setErrors] = useState<string[]>([]);
  const [doneState, setDoneState] = useState<{
    done: boolean;
    syncedNow: boolean;
  }>({ done: false, syncedNow: false });

  const filteredMunicipios = useMemo(() => {
    const base = regionSanitaria
      ? getMunicipiosByRegion(regionSanitaria)
      : MUNICIPIOS_PBA;
    const q = municipio.trim().toLowerCase();
    if (!q) return base.slice(0, 20);
    return base.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 20);
  }, [regionSanitaria, municipio]);

  const handleSubmit = async () => {
    const payload: ContactSubmissionPayload = {
      clientSubmissionId: makeContactUuid(),
      createdAtClient: new Date().toISOString(),
      sourcePlatform: "android",
      nombre,
      telefono,
      email,
      regionSanitaria,
      municipio,
      organizacionOEspacio,
      tematicasInteres,
      ofreceReferente,
      comentarios,
    };

    const check = validateContactSubmission(payload);
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }

    setErrors([]);
    const res = await onSaveContact(payload);
    setDoneState({ done: true, syncedNow: res.syncedNow });
  };

  if (doneState.done) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.doneTitle}>¡Contacto registrado!</Text>
        <Text style={styles.doneSub}>
          {doneState.syncedNow
            ? "✓ Sincronizado en la base desvinculada del servidor."
            : "Guardado en la cola offline del teléfono: se subirá automáticamente apenas conecte."}
        </Text>
        <Pressable onPress={onExitToHome} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>
            Volver a la Bandeja de Relevador
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBanner}>
        <Text style={styles.bannerBadge}>
          FORMULARIO INDEPENDIENTE · NO SE VINCULA CON RESPUESTAS
        </Text>
        <Text style={styles.bannerTitle}>
          Inscripción a Mesas de Trabajo — MOSAPRO
        </Text>
      </View>

      {errors.length > 0 && (
        <View style={styles.errorBox}>
          {errors.map((err, i) => (
            <Text key={i} style={styles.errorText}>
              • {err}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>Nombre y Apellido *</Text>
        <TextInput
          value={nombre}
          maxLength={120}
          onChangeText={setNombre}
          placeholder="Tu nombre y apellido"
          style={styles.input}
        />

        <Text style={styles.label}>Teléfono / WhatsApp *</Text>
        <TextInput
          value={telefono}
          maxLength={40}
          onChangeText={setTelefono}
          placeholder="Ej. 221 555-1234"
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Correo electrónico (opcional)</Text>
        <TextInput
          value={email}
          maxLength={120}
          onChangeText={setEmail}
          placeholder="correo@ejemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>
          Espacio, CAPS, Hospital u Organización (opcional)
        </Text>
        <TextInput
          value={organizacionOEspacio}
          maxLength={200}
          onChangeText={setOrganizacionOEspacio}
          placeholder="Dónde trabajás o participás"
          style={styles.input}
        />

        <Text style={styles.label}>Región Sanitaria *</Text>
        <View style={styles.chipsWrap}>
          {REGIONES_SANITARIAS.map((r) => {
            const active = regionSanitaria === r.code;
            return (
              <Pressable
                key={r.code}
                onPress={() => setRegionSanitaria(r.code)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {r.code}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Municipio *</Text>
        <TextInput
          value={municipio}
          maxLength={80}
          onChangeText={setMunicipio}
          placeholder="Buscá o seleccioná tu municipio..."
          style={styles.input}
        />
        <View style={styles.chipsWrap}>
          {filteredMunicipios.map((m) => {
            const active = municipio === m.name;
            return (
              <Pressable
                key={m.name}
                onPress={() => {
                  setMunicipio(m.name);
                  if (!regionSanitaria) setRegionSanitaria(m.regionCode);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {m.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Mesas temáticas de interés:</Text>
        <View style={styles.chipsWrap}>
          {themes
            .filter((t) => t.active !== false)
            .map((th) => {
              const checked = tematicasInteres.includes(th.label);
              return (
                <Pressable
                  key={th.id}
                  onPress={() =>
                    setTematicasInteres((prev) =>
                      prev.includes(th.label)
                        ? prev.filter((x) => x !== th.label)
                        : [...prev, th.label]
                    )
                  }
                  style={[styles.chip, checked && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      checked && styles.chipTextActive,
                    ]}
                  >
                    {checked ? "✓ " : ""}
                    {th.label}
                  </Text>
                </Pressable>
              );
            })}
        </View>

        <Pressable
          onPress={() => setOfreceReferente((prev) => !prev)}
          style={[styles.chip, ofreceReferente && styles.chipActive]}
        >
          <Text
            style={[
              styles.chipText,
              ofreceReferente && styles.chipTextActive,
            ]}
          >
            {ofreceReferente ? "☑ " : "☐ "}Me ofrezco como referente de mesa
          </Text>
        </Pressable>

        <Text style={styles.label}>Comentarios o disponibilidad</Text>
        <TextInput
          value={comentarios}
          maxLength={500}
          onChangeText={setComentarios}
          placeholder="Comentarios opcionales..."
          multiline
          style={[styles.input, { minHeight: 60 }]}
        />

        <View style={styles.footerRow}>
          <Pressable onPress={onExitToHome} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>← Volver</Text>
          </Pressable>
          <Pressable onPress={handleSubmit} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Guardar Contacto</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f6f7" },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  headerBanner: {
    backgroundColor: "#567c7f",
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  bannerBadge: {
    color: "#fde68a",
    fontSize: 10,
    fontWeight: "800",
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
    padding: 12,
    borderRadius: 10,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e6e9",
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1f2f40",
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    backgroundColor: "#ffffff",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  chipActive: {
    backgroundColor: "#567c7f",
    borderColor: "#567c7f",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  chipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
  },
  primaryBtn: {
    backgroundColor: "#567c7f",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: "#567c7f",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    color: "#567c7f",
    fontSize: 13,
    fontWeight: "700",
  },
  doneTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#567c7f",
  },
  doneSub: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
  },
});
