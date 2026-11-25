import Svg, { Path, Rect } from "react-native-svg";

export type IconName = "mic" | "stop" | "speaker" | "close" | "back" | "star" | "lock" | "shield" | "check" | "play";

type IconProps = { name: IconName; size?: number; color: string };

export const Icon = ({ name, size = 24, color }: IconProps) => {
  const stroke = { stroke: color, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {name === "mic" && (
        <>
          <Rect x="9" y="2" width="6" height="12" rx="3" {...stroke} />
          <Path d="M5 10a7 7 0 0 0 14 0" {...stroke} />
          <Path d="M12 17v4" {...stroke} />
        </>
      )}
      {name === "stop" && <Rect x="6" y="6" width="12" height="12" rx="3" fill={color} />}
      {name === "speaker" && (
        <>
          <Path d="M4 10v4h4l5 4V6L8 10z" {...stroke} />
          <Path d="M16.5 8.5a5 5 0 0 1 0 7" {...stroke} />
          <Path d="M19 6a8.5 8.5 0 0 1 0 12" {...stroke} />
        </>
      )}
      {name === "close" && <Path d="M6 6l12 12M18 6L6 18" {...stroke} strokeWidth={2.6} />}
      {name === "back" && <Path d="M15 5l-7 7 7 7" {...stroke} strokeWidth={2.6} />}
      {name === "star" && (
        <Path
          d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"
          fill={color}
          stroke={color}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      )}
      {name === "lock" && (
        <>
          <Rect x="5" y="11" width="14" height="10" rx="2" {...stroke} />
          <Path d="M8 11V8a4 4 0 0 1 8 0v3" {...stroke} />
        </>
      )}
      {name === "shield" && (
        <>
          <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" {...stroke} />
          <Path d="M8.5 12l2.5 2.5 4.5-5" {...stroke} />
        </>
      )}
      {name === "check" && <Path d="M5 12.5l4.5 4.5L19 7.5" {...stroke} strokeWidth={3} />}
      {name === "play" && <Path d="M8 5v14l11-7z" fill={color} />}
    </Svg>
  );
};
