import { Text } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { Subject } from "@/api/types";
import { ObjectShape } from "./picture";
import { fonts } from "./theme";

export const PlaceIcon = ({ subject, color }: { subject: Subject; color: string }) => {
  if (subject === "berhitung") return <ObjectShape kind="apple" size={48} />;
  if (subject === "membaca") return <Text style={{ fontFamily: fonts.display, fontSize: 38, color }}>Aa</Text>;
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48">
      <Circle cx={34} cy={13} r={7} fill="#FFC83D" />
      <Path d="M6 26c4-10 20-12 26 0z" fill="#E8483B" />
      <Path d="M19 26v16" stroke="#6B4A2B" strokeWidth={3} strokeLinecap="round" />
      <Path d="M4 42c6-3 12 3 20 0s14 3 20 0" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />
    </Svg>
  );
};
