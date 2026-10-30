import { ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { CONSENT_COPY } from "./(stack)/face-consent";

export default function PreviewPhase2b() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F4F6F8" }} contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={{ color: "#0B2748", fontSize: 28, fontWeight: "600", marginBottom: 12 }}>Face check-in</Text>
      <View style={{ backgroundColor: "#FFFFFF", borderColor: "#D5DDE6", borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        {CONSENT_COPY.map((line) => (
          <Text key={line} style={{ color: "#0B2748", marginBottom: 8 }}>{line}</Text>
        ))}
      </View>
      <Text style={{ color: "#0B2748", fontSize: 22, fontWeight: "600", marginBottom: 8 }}>Today's visits</Text>
      <View style={{ backgroundColor: "#FFFFFF", borderColor: "#D5DDE6", borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <Text style={{ color: "#0B2748", fontWeight: "600" }}>Harbour</Text>
        <Text style={{ color: "#4C5D73" }}>Flagged · 840 m · outside the site</Text>
      </View>
      <View style={{ backgroundColor: "#FFFFFF", borderColor: "#D5DDE6", borderWidth: 1, borderRadius: 16, padding: 16 }}>
        <Text style={{ color: "#0B2748", fontWeight: "600" }}>Northwind</Text>
        <Text style={{ color: "#4C5D73" }}>Present · 42 m</Text>
      </View>
    </ScrollView>
  );
}
