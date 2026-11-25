export const colors = {
  sky: "#E8F6FF",
  sea: "#5AA9F2",
  sand: "#FFF4D6",
  ink: "#1F2A44",
  inkSoft: "#5B6478",
  white: "#FFFFFF",
  accent: "#FF8A3D",
  success: "#3DBE7A",
  listening: "#E5484D",
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const radius = { md: 16, lg: 28, full: 999 } as const;

export const type = {
  title: { fontSize: 30, fontWeight: "800" as const },
  body: { fontSize: 20, fontWeight: "600" as const },
  caption: { fontSize: 16, fontWeight: "500" as const },
};
