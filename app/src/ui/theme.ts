export const colors = {
  sky: "#EAF6FF",
  cream: "#FFF6E9",
  sunshine: "#FFF1C9",
  paper: "#F4F6FA",
  white: "#FFFFFF",
  ink: "#1F2A44",
  inkSoft: "#4A5468",
  inkBody: "#3B4559",
  placeholder: "#6B7488",
  borderControl: "#7A8BA6",
  orange: "#D9601A",
  orangeDark: "#A8480F",
  orangeTint: "#FFE3CC",
  orangeSoftBg: "#FFF1E6",
  green: "#1E7A4C",
  greenDark: "#155937",
  greenTint: "#D8F3E6",
  blue: "#1F5FBF",
  blueDark: "#174A94",
  blueTint: "#D9EAFB",
  red: "#C0392B",
  redDark: "#922B21",
  redTint: "#FBD9D5",
  gold: "#FFC83D",
  goldDark: "#C99700",
  goldStroke: "#8C5B00",
  goldEmptyFill: "#F7E8BC",
  goldEmptyStroke: "#7A6740",
  line: "#C9D4E5",
  trackOrange: "#F3E4D6",
  trackBorder: "#9C8368",
  bubbleShadow: "#F2D9BF",
  heardBg: "#F1E4D4",
  pictureBorder: "#D49B6A",
  swatchRing: "#D4DDE9",
} as const;

export const fonts = {
  display: "Baloo2_800ExtraBold",
  body: "Nunito_600SemiBold",
  bodyBold: "Nunito_700Bold",
  bodyHeavy: "Nunito_800ExtraBold",
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const radius = { sm: 12, md: 16, lg: 22, xl: 28, full: 999 } as const;

export const layout = { maxWidth: 520 } as const;

export const type = {
  title: { fontFamily: fonts.display, fontSize: 28 },
  heading: { fontFamily: fonts.display, fontSize: 22 },
  body: { fontFamily: fonts.bodyBold, fontSize: 17 },
  bodyHeavy: { fontFamily: fonts.bodyHeavy, fontSize: 17 },
  caption: { fontFamily: fonts.bodyBold, fontSize: 14 },
} as const;
