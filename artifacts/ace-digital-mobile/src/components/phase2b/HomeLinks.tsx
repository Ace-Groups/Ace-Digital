import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { usePhase2b } from "@/theme/phase2b";

const LINKS = [
  ["Enroll face", "/(stack)/face-consent"],
  ["Face check-in", "/(stack)/face-check-in"],
  ["Field visit", "/(stack)/field-visit"],
  ["Work log", "/(stack)/work-log"],
  ["Presence", "/(stack)/presence-ping"],
  ["My week", "/(stack)/my-week"],
] as const;

export function HomeLinks() {
  const t = usePhase2b();
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: t.line, borderRadius: 16, backgroundColor: t.card, overflow: "hidden" }}>
      {LINKS.map(([label, href]) => (
        <Pressable key={href} accessibilityRole="button" onPress={() => router.push(href)} style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 16 }}>
          <Text style={{ color: t.text, fontSize: 16 }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
