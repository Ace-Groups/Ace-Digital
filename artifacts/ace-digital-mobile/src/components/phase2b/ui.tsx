import { Pressable, Text, TextInput, View } from "react-native";
import { Stack, router } from "expo-router";
import { usePhase2b } from "@/theme/phase2b";

export function PhaseScreen({ title, children }: { title: string; children: React.ReactNode }) {
  const t = usePhase2b();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: 52, paddingHorizontal: 16 }}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ color: t.primary, fontSize: 16 }}>Back</Text>
        </Pressable>
        <Text style={{ color: t.text, fontSize: 28, fontWeight: "600", marginBottom: 12 }}>{title}</Text>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 16 }}>{children}</View>
    </View>
  );
}

export function PhaseButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = usePhase2b();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: 48, borderRadius: 12, backgroundColor: t.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}
    >
      <Text style={{ color: t.onPrimary, fontSize: 16, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export function PhaseField({
  label,
  value,
  onChangeText,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  const t = usePhase2b();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: t.text, marginBottom: 6, fontWeight: "600" }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        style={{
          minHeight: multiline ? 96 : 48,
          borderWidth: 1,
          borderColor: t.line,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: t.text,
          backgroundColor: t.card,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

export function PhaseCard({ children }: { children: React.ReactNode }) {
  const t = usePhase2b();
  return <View style={{ borderWidth: 1, borderColor: t.line, backgroundColor: t.card, borderRadius: 16, padding: 16, marginBottom: 12 }}>{children}</View>;
}
