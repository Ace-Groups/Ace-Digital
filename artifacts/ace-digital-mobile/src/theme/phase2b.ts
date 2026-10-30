import { useColorScheme } from "react-native";

export function usePhase2b() {
  const dark = useColorScheme() === "dark";
  if (dark) {
    return {
      bg: "#0B1524",
      card: "#122033",
      text: "#F4F6F8",
      muted: "#B7C3D4",
      primary: "#8FB4E8",
      onPrimary: "#0B1524",
      line: "#24344A",
    };
  }
  return {
    bg: "#F4F6F8",
    card: "#FFFFFF",
    text: "#0B2748",
    muted: "#4C5D73",
    primary: "#0B2748",
    onPrimary: "#F4F6F8",
    line: "#D5DDE6",
  };
}
