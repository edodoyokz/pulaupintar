# Pulau Pintar Design Direction

## Product & Audience

Pulau Pintar is a voice-first mobile learning companion for Indonesian children ages 4 to 7 and their parents. Children navigate by big illustrations, warm spoken guidance from Kak Pinta the yellow-crested cockatoo, and chunky tactile buttons; parents manage child profiles, daily learning limits, and sticker progress behind an adult math gate.

## Design Read & Dials

Dial: ENERGY 2 / RHYTHM 2 / MOTION 2

- **ENERGY 2 (Balanced Warmth):** Storybook warmth and clear contrast without neon gradients, glows, or visual clutter.
- **RHYTHM 2 (Consistent with Deliberate Focus):** Each screen has one primary focal action (microphone in lessons, three learning places on the island, single profile form in onboarding) with calm breathing room around it.
- **MOTION 2 (Purposeful Expressiveness):** Kak Pinta animates to show speaking, listening, thinking, and celebration; celebrations settle after a few hops instead of looping endlessly, and all motion honors the system Reduced Motion setting.

## Color Palette

### Core Surfaces
- `sky`: `#EAF6FF` (Onboarding, Island, Levels background)
- `cream`: `#FFF6E9` (Active lesson canvas)
- `sunshine`: `#FFF1C9` (Reward and rest canvas)
- `paper`: `#F4F6FA` (Parent area background)
- `white`: `#FFFFFF` (Elevated cards and speech bubbles)

### Ink & Control Boundaries (WCAG AA Verified)
- `ink`: `#1F2A44` (Primary headings and card titles; 14.26:1 on white, 12.98:1 on sky)
- `inkBody`: `#3B4559` (Body copy; 9.63:1 on white, 8.77:1 on sky)
- `inkSoft`: `#4A5468` (Secondary labels; 7.61:1 on white, 7.11:1 on cream)
- `placeholder`: `#6B7488` (Input placeholders; 4.69:1 on white)
- `borderControl`: `#7A8BA6` (Input and chip borders; 3.46:1 on white, 3.20:1 on paper)
- `trackBorder`: `#9C8368` (Unfilled lesson progress dashes on cream; 3.35:1 on cream)

### Subject Accents & Semantic Feedback
- **Berhitung (Kebun Angka):** `orange` `#D9601A` (3.72:1 large white text), `orangeDark` `#A8480F` (4.75:1 on `orangeTint` `#FFE3CC`, 5.27:1 on `orangeSoftBg` `#FFF1E6`)
- **Membaca (Rumah Huruf):** `green` `#1E7A4C` (5.33:1 white text), `greenDark` `#155937` (7.11:1 on `greenTint` `#D8F3E6`)
- **Bahasa Inggris (Pantai English):** `blue` `#1F5FBF` (6.09:1 white text; 4.96:1 on `blueTint` `#D9EAFB`), `blueDark` `#174A94`
- **Recording / Destructive:** `red` `#C0392B` (5.44:1 white text), `redDark` `#922B21` (6.17:1 on `redTint` `#FBD9D5`)
- **Stars & Crest:** `gold` `#FFC83D` paired with `goldStroke` `#8C5B00` (5.17:1 on sunshine), empty star `goldEmptyFill` `#F7E8BC` with `goldEmptyStroke` `#7A6740` (4.86:1 on sunshine)

## Typography

- **Display & Headings:** `Baloo2_800ExtraBold` (`fonts.display`). Friendly rounded terminals match early-childhood picture books and stay legible at large numeral/letter sizes.
- **Body & UI Controls:** `Nunito_600SemiBold`, `Nunito_700Bold`, `Nunito_800ExtraBold`. Open counters keep Indonesian labels, parent controls, and short reading cards clear on small phone screens.

## Layout, Touch Targets & Motion Policy

- **Spacing & Radii:** Spacing scale `4 / 8 / 16 / 24 / 32`; radius scale `sm: 12`, `md: 16`, `lg: 22`, `xl: 28`, `full: 999`.
- **Tablet & Compact Phone Support:** Main screen columns cap at `maxWidth: 520` centered horizontally; lesson picture cards scale down smoothly on viewports shorter than `720dp`.
- **Touch Targets & Tactile Feedback:** Every interactive control meets at least `44 x 44` dp and provides immediate `pressed` visual feedback (`translateY` press or subtle scale/opacity shift).
- **Accessibility & Motion:** Celebration animations run a short sequence and settle; `useReducedMotion` switches Kak Pinta and microphone rings to calm static states.
