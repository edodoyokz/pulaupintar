// Builds assets/rive/kak-pinta.riv from the Kak Pinta artwork, without the Rive editor.
//
//   node rive/build.mjs            # writes assets/rive/kak-pinta.riv
//   node rive/build.mjs out.riv    # somewhere else
//
// Needs the rive-mcp tooling from devDependencies and a Chromium-based browser (PATH, or RIVE_MCP_CHROME).
// Artwork is one SVG per body part, each drawn in the 220x220 art space with the part's pivot moved to
// the origin, then assembled into one rig with a "KakPinta" state machine.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.argv[2] ?? join(HERE, "..", "assets", "rive", "kak-pinta.riv"));
const DIR = join(HERE, ".build");
fs.mkdirSync(DIR, { recursive: true });

// ---- rig: groups with absolute pivots (220x220 art space) ----
const G = [
  ["shadow", null, 110, 205],
  ["react", null, 110, 190],
  ["pose", "react", 110, 176],
  ["feet", "pose", 110, 190],
  ["breath", "pose", 110, 176],
  ["talkNod", "breath", 110, 150],
  ["crestPose", "talkNod", 110, 62],
  ["crestIdle", "crestPose", 110, 62],
  ["crestListen", "crestIdle", 110, 62],
  ["cheeks", "talkNod", 110, 126],
  ["eyesGX", "talkNod", 110, 108],
  ["eyesGY", "eyesGX", 110, 108],
  ["eyeMode", "eyesGY", 110, 108, { solo: true }],
  ["eyesOpen", "eyeMode", 110, 108],
  ["eyesHappy", "eyeMode", 110, 108],
  ["brows", "talkNod", 110, 88],
  ["browListen", "brows", 110, 88],
  ["browThink", "brows", 110, 88],
  ["lidsWrap", "talkNod", 110, 93],
  ["lids", "lidsWrap", 110, 93],
  ["mouth", "talkNod", 110, 121],
  ["jaw", "talkNod", 110, 121],
  ["beakTop", "talkNod", 110, 118],
  ["wingLPose", "breath", 48, 128],
  ["wingLFx", "wingLPose", 48, 128],
  ["wingLIdle", "wingLFx", 48, 128],
  ["wingRPose", "breath", 172, 128],
  ["wingRFx", "wingRPose", 172, 128],
  ["wingRIdle", "wingRFx", 172, 128],
  ["accWaves", "pose", 34, 80],
  ["accWavesLvl", "accWaves", 34, 80],
  ["accDots", "pose", 176, 56],
  ["sparkles", "pose", 110, 52],
  ["sparkleBurst", "pose", 110, 52],
];
const abs = Object.fromEntries(G.map(([id, , x, y]) => [id, [x, y]]));

const INK = "#1F2A44";
const grad = {
  crest: `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE885"/><stop offset="0.55" stop-color="#FFC83D"/><stop offset="1" stop-color="#F2AC18"/></linearGradient>`,
  body: `<radialGradient id="g" cx="0.42" cy="0.32" r="0.65"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.62" stop-color="#FFFDF5"/><stop offset="1" stop-color="#F3E7CE"/></radialGradient>`,
  beak: `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#76829A"/><stop offset="0.55" stop-color="#556075"/><stop offset="1" stop-color="#454F62"/></linearGradient>`,
  wing: `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FAF2E1"/><stop offset="1" stop-color="#EBE0C5"/></linearGradient>`,
};
const crestPath = (d) => `<path d="${d}" fill="url(#g)" stroke="#C27D00" stroke-width="2.2" stroke-linejoin="round"/>`;

// part id -> [parent group, defs, body]
const PARTS = {
  shadow: ["shadow", "", `<ellipse cx="110" cy="205" rx="52" ry="8.5" fill="${INK}" opacity="0.11"/><ellipse cx="110" cy="205" rx="33" ry="4.8" fill="${INK}" opacity="0.07"/>`],
  feetArt: ["feet", "", [84, 128].map((x) => `<path d="M${x} 184 L${x} 192 C${x - 6} 193 ${x - 11} 196 ${x - 10} 200 C${x - 9} 203 ${x - 4} 203 ${x} 200 C${x + 1} 204 ${x + 7} 204 ${x + 8} 200 C${x + 12} 203 ${x + 17} 203 ${x + 18} 200 C${x + 19} 196 ${x + 14} 193 ${x + 8} 192 L${x + 8} 184 Z" fill="#F5B727" stroke="#C98A00" stroke-width="2.2" stroke-linejoin="round"/>`).join("")],
  crestArt: ["crestListen", grad.crest, [
    "M95 66 C78 44 74 28 84 26 C92 25 97 44 101 64 Z",
    "M103 63 C95 32 101 14 112 16 C121 18 117 42 110 63 Z",
    "M111 64 C113 38 124 22 134 27 C141 31 129 48 117 65 Z",
    "M117 67 C126 48 140 39 146 46 C150 51 136 60 122 68 Z",
  ].map(crestPath).join("") +
    `<path d="M85 33 C89 41 92 50 94 58" stroke="#FFF5B8" stroke-width="2" stroke-linecap="round" opacity="0.75" fill="none"/><path d="M108 22 C108 34 107 46 106 57" stroke="#FFF5B8" stroke-width="2.2" stroke-linecap="round" opacity="0.75" fill="none"/><path d="M128 32 C125 41 121 50 116 58" stroke="#FFF5B8" stroke-width="1.8" stroke-linecap="round" opacity="0.75" fill="none"/>`],
  tufts: ["breath", "", `<path d="M72 170 C62 182 64 191 74 191 C82 191 88 184 91 178 Z" fill="#EFE3C8" stroke="#D4C29E" stroke-width="2.2" stroke-linejoin="round"/><path d="M148 170 C158 182 156 191 146 191 C138 191 132 184 129 178 Z" fill="#EFE3C8" stroke="#D4C29E" stroke-width="2.2" stroke-linejoin="round"/>`],
  bodyArt: ["talkNod", grad.body, `<path d="M110 58 C144 58 168 78 172 108 C176 130 176 154 164 171 C152 186 132 190 110 190 C88 190 68 186 56 171 C44 154 44 130 48 108 C52 78 76 58 110 58 Z" fill="url(#g)" stroke="#C6A47E" stroke-width="2.8"/><ellipse cx="88" cy="74" rx="24" ry="9" fill="#FFFFFF" opacity="0.58"/><path d="M62 169 C78 186 142 186 158 169 C144 180 76 180 62 169 Z" fill="#E6D5B4" opacity="0.38"/><ellipse cx="110" cy="157" rx="41" ry="27" fill="#FFF4D9"/><path d="M91 149 Q97 154 103 149 M107 154 Q113 159 119 154 M118 147 Q124 152 130 147" stroke="#E7D5B0" stroke-width="2" stroke-linecap="round" fill="none"/>`],
  cheekArt: ["cheeks", "", `<ellipse cx="65" cy="126" rx="12.5" ry="9" fill="#FFAD9B" opacity="0.75"/><ellipse cx="155" cy="126" rx="12.5" ry="9" fill="#FFAD9B" opacity="0.75"/><ellipse cx="64" cy="124" rx="6" ry="4" fill="#FFC8BA" opacity="0.7"/><ellipse cx="154" cy="124" rx="6" ry="4" fill="#FFC8BA" opacity="0.7"/>`],
  eyesOpenArt: ["eyesOpen", "", `<ellipse cx="82" cy="108" rx="13" ry="14" fill="${INK}"/><ellipse cx="138" cy="108" rx="13" ry="14" fill="${INK}"/><path d="M73 114 Q82 120 91 114" stroke="#32456E" stroke-width="3.2" stroke-linecap="round" fill="none" opacity="0.65"/><path d="M129 114 Q138 120 147 114" stroke="#32456E" stroke-width="3.2" stroke-linecap="round" fill="none" opacity="0.65"/><circle cx="86" cy="102" r="4.6" fill="#FFFFFF"/><circle cx="142" cy="102" r="4.6" fill="#FFFFFF"/><circle cx="77" cy="113" r="2" fill="#FFFFFF" opacity="0.85"/><circle cx="133" cy="113" r="2" fill="#FFFFFF" opacity="0.85"/>`],
  eyesHappyArt: ["eyesHappy", "", `<path d="M69 111 Q82 94 95 111" stroke="${INK}" stroke-width="5.2" stroke-linecap="round" fill="none"/><path d="M125 111 Q138 94 151 111" stroke="${INK}" stroke-width="5.2" stroke-linecap="round" fill="none"/><path d="M65 112 L61 110 M155 112 L159 110" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity="0.45" fill="none"/>`],
  browListenArt: ["browListen", "", `<path d="M71 89 Q82 84 92 89" stroke="#8C97AD" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M128 89 Q138 84 149 89" stroke="#8C97AD" stroke-width="2.4" stroke-linecap="round" fill="none"/>`],
  browThinkArt: ["browThink", "", `<path d="M72 91 Q82 89 91 91" stroke="#8C97AD" stroke-width="2.3" stroke-linecap="round" fill="none"/><path d="M127 87 Q138 80 150 86" stroke="#8C97AD" stroke-width="2.5" stroke-linecap="round" fill="none"/>`],
  lidArt: ["lids", "", `<ellipse cx="82" cy="108" rx="14.5" ry="15" fill="#FFFBF0"/><ellipse cx="138" cy="108" rx="14.5" ry="15" fill="#FFFBF0"/><path d="M69 109 Q82 117 95 109" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" fill="none"/><path d="M125 109 Q138 117 151 109" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" fill="none"/>`],
  mouthArt: ["mouth", "", `<ellipse cx="110" cy="124" rx="10.5" ry="7.5" fill="#B8443A"/><ellipse cx="110" cy="126.5" rx="7" ry="4.2" fill="#F07B6E"/><ellipse cx="108.5" cy="125.2" rx="3" ry="1.5" fill="#F9A89E" opacity="0.8"/>`],
  jawArt: ["jaw", "", `<path d="M99 121 L121 121 C120 132 115 137 110 137 C105 137 100 132 99 121 Z" fill="#4C566A" stroke="#3A4354" stroke-width="2" stroke-linejoin="round"/>`],
  beakArt: ["beakTop", grad.beak, `<path d="M93 116 C95 106 125 106 127 116 C127 121 119 122 115 123 C112 126 111 129 110 130 C109 129 108 126 105 123 C101 122 93 121 93 116 Z" fill="url(#g)" stroke="#3A4354" stroke-width="2" stroke-linejoin="round"/><path d="M101 113 Q110 109 119 113" stroke="#A8B5CC" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="0.55"/><circle cx="104" cy="115" r="1.3" fill="#3A4354" opacity="0.7"/><circle cx="116" cy="115" r="1.3" fill="#3A4354" opacity="0.7"/>`],
  wingLArt: ["wingLIdle", grad.wing, `<path d="M52 116 C35 120 29 144 37 161 C40 167 46 164 49 160 C52 164 58 161 59 154 C62 140 59 122 52 116 Z" fill="url(#g)" stroke="#C6A47E" stroke-width="2.6" stroke-linejoin="round"/><path d="M48 128 C41 136 40 146 43 154" stroke="#E0D2B4" stroke-width="2" stroke-linecap="round" fill="none"/>`],
  wingRArt: ["wingRIdle", grad.wing, `<path d="M168 116 C185 120 191 144 183 161 C180 167 174 164 171 160 C168 164 162 161 161 154 C158 140 161 122 168 116 Z" fill="url(#g)" stroke="#C6A47E" stroke-width="2.6" stroke-linejoin="round"/><path d="M172 128 C179 136 180 146 177 154" stroke="#E0D2B4" stroke-width="2" stroke-linecap="round" fill="none"/>`],
  wavesArt: ["accWavesLvl", "", `<path d="M40 72 Q33 81 37 91" stroke="#2E73D8" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M32 64 Q21 79 27 95" stroke="#2E73D8" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.7"/>`],
  dotsArt: ["accDots", "", `<circle cx="167" cy="67" r="3.5" fill="#F2B01E"/><circle cx="176" cy="56" r="4.8" fill="#F2B01E"/><circle cx="187" cy="43" r="6.2" fill="#F2B01E"/>`],
  sparkleArt: ["sparkles", "", `<path d="M44 42 L47 50 L55 53 L47 56 L44 64 L41 56 L33 53 L41 50 Z" fill="#FFC83D" stroke="#E5A800" stroke-width="1.2" stroke-linejoin="round"/><path d="M177 45 L179 51 L185 53 L179 55 L177 61 L175 55 L169 53 L175 51 Z" fill="#FF8A5B" stroke="#D9601A" stroke-width="1.2" stroke-linejoin="round"/>`],
  burstArt: ["sparkleBurst", "", `<path d="M40 30 L44 40 L54 44 L44 48 L40 58 L36 48 L26 44 L36 40 Z" fill="#FFC83D" stroke="#E5A800" stroke-width="1.2" stroke-linejoin="round"/><path d="M182 34 L185 42 L193 45 L185 48 L182 56 L179 48 L171 45 L179 42 Z" fill="#FFC83D" stroke="#E5A800" stroke-width="1.2" stroke-linejoin="round"/><path d="M110 4 L112 10 L118 12 L112 14 L110 20 L108 14 L102 12 L108 10 Z" fill="#FF8A5B" stroke="#D9601A" stroke-width="1.2" stroke-linejoin="round"/>`],
};

// ---- animation helpers ----
const FPS = 60;
const f = (s) => Math.round(s * FPS);
// track(target, prop, [[sec, value, easing?], ...]); x/y values are offsets from the group's rest position
const parentOf = Object.fromEntries(G.map(([id, parent]) => [id, parent]));
const OFFSET = [10, 26]; // artboard margin so hops and crest never clip
const rest = (id, axis) => abs[id][axis] - (parentOf[id] ? abs[parentOf[id]][axis] : -OFFSET[axis]);
const track = (target, property, keys) => ({
  target,
  property,
  keyframes: keys.map(([t, value, easing]) => ({
    frame: f(t),
    value: property === "x" ? value + rest(target, 0) : property === "y" ? value + rest(target, 1) : value,
    ...(easing ? { easing } : {}),
  })),
});
const hold = (target, property, value) => track(target, property, [[0, value]]);
const pose = (name, dur, overrides, extraTracks = [], loop = "oneShot") => {
  const base = {
    "pose.rotation": 0, "pose.y": 0,
    "crestPose.rotation": 0, "wingLPose.rotation": 0, "wingRPose.rotation": 0,
    "eyesOpen.scaleX": 1, "eyesOpen.scaleY": 1, "eyesOpen.y": 0,
    "cheeks.scaleX": 1, "cheeks.scaleY": 1,
    "browListen.opacity": 0, "browThink.opacity": 0, "lidsWrap.opacity": 1,
    "accWaves.opacity": 0, "accDots.opacity": 0, "sparkles.opacity": 0,
  };
  const animated = new Set(extraTracks.map((t) => `${t.target}.${t.property}`));
  const tracks = Object.entries({ ...base, ...overrides })
    .filter(([k]) => !animated.has(k))
    .map(([k, v]) => { const [t, p] = k.split("."); return hold(t, p, v); });
  return { name, fps: FPS, duration: Math.max(1, f(dur)), loop, tracks: [...tracks, ...extraTracks] };
};
const solo = (ref) => ({ target: "eyeMode", property: "soloActive", keyframes: [{ frame: 0, ref }] });

const animations = [
  // idle layer: incommensurate breathing / crest / wing drift inside one 7.2s loop
  { name: "idle_live", fps: FPS, duration: f(7.2), loop: "loop", tracks: [
    track("breath", "scaleY", [[0, 1], [1.8, 1.022, "ease-in-out"], [3.6, 1, "ease-in-out"], [5.4, 1.022, "ease-in-out"], [7.2, 1, "ease-in-out"]]),
    track("breath", "scaleX", [[0, 1], [1.8, 0.99, "ease-in-out"], [3.6, 1, "ease-in-out"], [5.4, 0.99, "ease-in-out"], [7.2, 1, "ease-in-out"]]),
    track("crestIdle", "rotation", [[0, 0], [2.5, 2.5, "ease-in-out"], [5, -1.5, "ease-in-out"], [7.2, 0, "ease-in-out"]]),
    track("wingLIdle", "rotation", [[0, 0], [2.2, -3, "ease-in-out"], [4.3, 1, "ease-in-out"], [7.2, 0, "ease-in-out"]]),
    track("wingRIdle", "rotation", [[0, 0], [2.8, 3, "ease-in-out"], [5, -1, "ease-in-out"], [7.2, 0, "ease-in-out"]]),
  ] },
  { name: "idle_still", fps: FPS, duration: 1, loop: "oneShot", tracks: [
    hold("breath", "scaleY", 1), hold("breath", "scaleX", 1), hold("crestIdle", "rotation", 0),
    hold("wingLIdle", "rotation", 0), hold("wingRIdle", "rotation", 0),
  ] },
  // blink layer: irregular blinks (single, double, single) over 9.6s
  (() => {
    const ks = [[0, 0.05]], op = [[0, 0]];
    for (const t of [1.15, 4.3, 4.72, 7.5]) {
      ks.push([t, 0.05], [t + 0.07, 1, "ease-in"], [t + 0.1, 1], [t + 0.19, 0.05, "ease-out"]);
      op.push([t, 1, "hold"], [t + 0.19, 0, "hold"]);
    }
    ks.push([9.6, 0.05]); op.push([9.6, 0]);
    return { name: "blink", fps: FPS, duration: f(9.6), loop: "loop", tracks: [track("lids", "scaleY", ks), track("lids", "opacity", op)] };
  })(),
  // mood layer
  pose("mood_talk", 0.02, {}, [solo("eyesOpen")]),
  pose("mood_listen", 2.4, {
    "pose.rotation": -6, "crestPose.rotation": 4, "wingLPose.rotation": 3, "wingRPose.rotation": -3,
    "eyesOpen.scaleX": 1.05, "eyesOpen.scaleY": 1.05, "browListen.opacity": 1,
  }, [solo("eyesOpen"), track("accWaves", "opacity", [[0, 0.45], [1.2, 1, "ease-in-out"], [2.4, 0.45, "ease-in-out"]])], "loop"),
  pose("mood_think", 3.6, {
    "pose.rotation": 4.5, "crestPose.rotation": -2, "wingLPose.rotation": 3, "wingRPose.rotation": -24,
    "eyesOpen.y": -2.5, "browThink.opacity": 1,
  }, [solo("eyesOpen"),
    track("accDots", "opacity", [[0, 0.5], [0.9, 1, "ease-in-out"], [1.8, 0.5, "ease-in-out"], [2.7, 1, "ease-in-out"], [3.6, 0.5, "ease-in-out"]]),
    track("pose", "rotation", [[0, 4.5], [1.8, 6, "ease-in-out"], [3.6, 4.5, "ease-in-out"]])], "loop"),
  pose("mood_happy", 2.1, {
    "lidsWrap.opacity": 0, "cheeks.scaleX": 1.12, "cheeks.scaleY": 1.12,
  }, [solo("eyesHappy"),
    track("pose", "y", [[0, 0], [0.26, -11, "ease-out"], [0.52, 0, "ease-in"], [0.78, -9, "ease-out"], [1.04, 0, "ease-in"], [1.3, -6, "ease-out"], [1.56, 0, "ease-in"]]),
    track("pose", "rotation", [[0, 0], [0.36, -4, "ease-in-out"], [0.72, 4, "ease-in-out"], [1.08, -3, "ease-in-out"], [1.5, 0, "ease-out-back"]]),
    track("crestPose", "rotation", [[0, 0], [0.26, 7, "ease-out"], [0.52, -4, "ease-in-out"], [0.78, 6, "ease-in-out"], [1.04, -3, "ease-in-out"], [1.4, 4, "ease-out-back"]]),
    track("wingLPose", "rotation", [[0, 0], [0.22, 28, "ease-out"], [0.44, 6, "ease-in"], [0.66, 26, "ease-out"], [0.88, 6, "ease-in"], [1.1, 22, "ease-out"], [1.5, 10, "ease-in-out"]]),
    track("wingRPose", "rotation", [[0, 0], [0.26, -28, "ease-out"], [0.48, -6, "ease-in"], [0.7, -26, "ease-out"], [0.92, -6, "ease-in"], [1.14, -22, "ease-out"], [1.54, -10, "ease-in-out"]]),
    track("sparkles", "opacity", [[0, 0], [0.2, 1, "ease-out"], [1.4, 1], [2.1, 0, "ease-in"]]),
  ]),
  pose("mood_happy_still", 0.02, {
    "lidsWrap.opacity": 0, "cheeks.scaleX": 1.12, "cheeks.scaleY": 1.12,
    "crestPose.rotation": 4, "wingLPose.rotation": 10, "wingRPose.rotation": -10,
  }, [solo("eyesHappy")]),
  // mouth blend (driven by audio level 0..1)
  { name: "mouth_0", fps: FPS, duration: 1, loop: "oneShot", tracks: [
    hold("jaw", "y", 0), hold("mouth", "scaleY", 0.2), hold("mouth", "opacity", 0), hold("talkNod", "rotation", 0), hold("talkNod", "y", 0),
  ] },
  { name: "mouth_1", fps: FPS, duration: 1, loop: "oneShot", tracks: [
    hold("jaw", "y", 7), hold("mouth", "scaleY", 1.05), hold("mouth", "opacity", 1), hold("talkNod", "rotation", -1.6), hold("talkNod", "y", -1.2),
  ] },
  // gaze blends
  ...[["gaze_l", -4.5], ["gaze_c", 0], ["gaze_r", 4.5]].map(([name, x]) => ({ name, fps: FPS, duration: 1, loop: "oneShot", tracks: [hold("eyesGX", "x", x)] })),
  // The beak sits right under the eyes, so looking down travels less than looking up.
  ...[["gaze_u", -3.5], ["gaze_m", 0], ["gaze_d", 1.8]].map(([name, y]) => ({ name, fps: FPS, duration: 1, loop: "oneShot", tracks: [hold("eyesGY", "y", y)] })),
  // child's mic level
  { name: "listen_0", fps: FPS, duration: 1, loop: "oneShot", tracks: [hold("crestListen", "rotation", 0), hold("accWavesLvl", "scaleX", 1), hold("accWavesLvl", "scaleY", 1)] },
  { name: "listen_1", fps: FPS, duration: 1, loop: "oneShot", tracks: [hold("crestListen", "rotation", 7), hold("accWavesLvl", "scaleX", 1.3), hold("accWavesLvl", "scaleY", 1.3)] },
  // reactions
  { name: "react_rest", fps: FPS, duration: 1, loop: "oneShot", tracks: [
    hold("react", "y", 0), hold("react", "rotation", 0), hold("react", "scaleX", 1), hold("react", "scaleY", 1),
    hold("wingLFx", "rotation", 0), hold("wingRFx", "rotation", 0), hold("sparkleBurst", "opacity", 0), hold("sparkleBurst", "scaleX", 0.6), hold("sparkleBurst", "scaleY", 0.6),
    hold("shadow", "scaleX", 1), hold("shadow", "opacity", 1),
  ] },
  { name: "react_correct", fps: FPS, duration: f(1.4), loop: "oneShot", tracks: [
    track("react", "scaleY", [[0, 1], [0.1, 0.86, "ease-out"], [0.27, 1.08, "ease-out"], [0.62, 1, "ease-in-out"], [0.72, 0.9, "ease-in"], [0.92, 1, "ease-out-back"]]),
    track("react", "scaleX", [[0, 1], [0.1, 1.1, "ease-out"], [0.27, 0.95, "ease-out"], [0.62, 1, "ease-in-out"], [0.72, 1.07, "ease-in"], [0.92, 1, "ease-out-back"]]),
    track("react", "y", [[0, 0], [0.1, 2, "ease-out"], [0.37, -22, "emphasized-decel"], [0.64, 0, "ease-in"], [1.4, 0]]),
    track("shadow", "scaleX", [[0, 1], [0.1, 1.06, "ease-out"], [0.37, 0.78, "emphasized-decel"], [0.64, 1, "ease-in"]]),
    track("shadow", "opacity", [[0, 1], [0.37, 0.6, "emphasized-decel"], [0.64, 1, "ease-in"]]),
    track("react", "rotation", [[0, 0], [0.37, -6, "ease-out"], [0.64, 3, "ease-in-out"], [0.95, 0, "ease-out-back"]]),
    track("wingLFx", "rotation", [[0, 0], [0.1, -8, "ease-out"], [0.3, 36, "ease-out"], [0.47, 10, "ease-in-out"], [0.64, 30, "ease-out"], [0.85, 0, "ease-in-out"]]),
    track("wingRFx", "rotation", [[0, 0], [0.12, 8, "ease-out"], [0.33, -36, "ease-out"], [0.5, -10, "ease-in-out"], [0.67, -30, "ease-out"], [0.88, 0, "ease-in-out"]]),
    track("sparkleBurst", "opacity", [[0, 0], [0.23, 1, "ease-out"], [0.9, 1], [1.4, 0, "ease-in"]]),
    track("sparkleBurst", "scaleX", [[0, 0.6], [0.47, 1.15, "ease-out-back"], [1.4, 1.2]]),
    track("sparkleBurst", "scaleY", [[0, 0.6], [0.47, 1.15, "ease-out-back"], [1.4, 1.2]]),
  ] },
  { name: "react_hint", fps: FPS, duration: f(1.05), loop: "oneShot", tracks: [
    track("react", "rotation", [[0, 0], [0.2, -6, "ease-out"], [0.8, -5, "ease-in-out"], [1.05, 0, "ease-in-out"]]),
    track("react", "y", [[0, 0], [0.33, 3, "ease-in-out"], [0.5, 0, "ease-in-out"], [0.67, 3, "ease-in-out"], [0.85, 0, "ease-out"]]),
    track("wingRFx", "rotation", [[0, 0], [0.25, -14, "ease-out"], [0.8, -12], [1.05, 0, "ease-in-out"]]),
  ] },
  { name: "react_tap", fps: FPS, duration: f(0.7), loop: "oneShot", tracks: [
    track("react", "scaleY", [[0, 1], [0.08, 0.8, "ease-out"], [0.23, 1.12, "ease-out"], [0.37, 0.95, "ease-in-out"], [0.5, 1, "ease-out"]]),
    track("react", "scaleX", [[0, 1], [0.08, 1.14, "ease-out"], [0.23, 0.92, "ease-out"], [0.37, 1.03, "ease-in-out"], [0.5, 1, "ease-out"]]),
    track("react", "rotation", [[0, 0], [0.23, -4, "ease-out"], [0.4, 3, "ease-in-out"], [0.6, 0, "ease-out"]]),
    track("wingLFx", "rotation", [[0, 0], [0.08, -6, "ease-out"], [0.27, 20, "ease-out"], [0.5, 0, "ease-in-out"]]),
    track("wingRFx", "rotation", [[0, 0], [0.08, 6, "ease-out"], [0.27, -20, "ease-out"], [0.5, 0, "ease-in-out"]]),
  ] },
  { name: "react_reveal", fps: FPS, duration: f(1.6), loop: "oneShot", tracks: [
    track("wingRFx", "rotation", [[0, 0], [0.13, 6, "ease-out"], [0.4, -60, "ease-out-back"], [1.2, -58], [1.5, 0, "ease-in-out"]]),
    track("react", "rotation", [[0, 0], [0.4, 4, "ease-out"], [1.2, 4], [1.5, 0, "ease-in-out"]]),
  ] },
];

const MOODS = ["mood_talk", "mood_listen", "mood_think", "mood_happy", "mood_happy_still"];
const moodTransitions = [{ from: "entry", to: "mood_talk" }];
for (const [i, a] of MOODS.entries())
  for (const [j, b] of MOODS.entries())
    if (i !== j) moodTransitions.push({ from: a, to: b, durationMs: 280, condition: { input: "mood", op: "==", value: j } });

const REACTS = ["correct", "hint", "tap", "reveal"];
const durOf = (n) => Math.round((animations.find((a) => a.name === n).duration / FPS) * 1000);

const stateMachine = {
  name: "KakPinta",
  inputs: [
    { name: "mood", type: "number", initial: 0 },
    { name: "mouthOpen", type: "number", initial: 0 },
    { name: "gazeX", type: "number", initial: 0 },
    { name: "gazeY", type: "number", initial: 0 },
    { name: "listenLevel", type: "number", initial: 0 },
    { name: "reducedMotion", type: "bool", initial: false },
    ...REACTS.map((name) => ({ name, type: "trigger" })),
  ],
  layers: [
    { name: "idle", states: [{ name: "idle_live", animation: "idle_live" }, { name: "idle_still", animation: "idle_still" }],
      transitions: [
        { from: "entry", to: "idle_live" },
        { from: "idle_live", to: "idle_still", durationMs: 300, condition: { input: "reducedMotion", value: true } },
        { from: "idle_still", to: "idle_live", durationMs: 300, condition: { input: "reducedMotion", value: false } },
      ] },
    { name: "blink", states: [{ name: "blink", animation: "blink" }], transitions: [{ from: "entry", to: "blink" }] },
    { name: "mood", states: MOODS.map((m) => ({ name: m, animation: m })), transitions: moodTransitions },
    { name: "mouth", states: [{ name: "mouth", blend1d: { input: "mouthOpen", animations: [{ animation: "mouth_0", value: 0 }, { animation: "mouth_1", value: 1 }] } }], transitions: [{ from: "entry", to: "mouth" }] },
    { name: "gazeX", states: [{ name: "gx", blend1d: { input: "gazeX", animations: [{ animation: "gaze_l", value: -1 }, { animation: "gaze_c", value: 0 }, { animation: "gaze_r", value: 1 }] } }], transitions: [{ from: "entry", to: "gx" }] },
    { name: "gazeY", states: [{ name: "gy", blend1d: { input: "gazeY", animations: [{ animation: "gaze_u", value: -1 }, { animation: "gaze_m", value: 0 }, { animation: "gaze_d", value: 1 }] } }], transitions: [{ from: "entry", to: "gy" }] },
    { name: "listen", states: [{ name: "lv", blend1d: { input: "listenLevel", animations: [{ animation: "listen_0", value: 0 }, { animation: "listen_1", value: 1 }] } }], transitions: [{ from: "entry", to: "lv" }] },
    { name: "react", states: [{ name: "react_rest", animation: "react_rest" }, ...REACTS.map((r) => ({ name: `react_${r}`, animation: `react_${r}` }))],
      transitions: [
        { from: "entry", to: "react_rest" },
        ...REACTS.map((r) => ({ from: "react_rest", to: `react_${r}`, condition: { input: r } })),
        ...REACTS.map((r) => ({ from: `react_${r}`, to: "react_rest", exitTimeMs: durOf(`react_${r}`), durationMs: 120 })),
      ] },
  ],
};

// ---- run ----
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve(HERE, "..", "node_modules/rive-mcp-server/dist/index.js")],
  cwd: HERE,
  // rive-mcp finds Chrome/Edge/Chromium itself; RIVE_MCP_CHROME in the environment overrides it.
  env: { ...process.env },
  stderr: "ignore",
});
const client = new Client({ name: "build", version: "1" });
await client.connect(transport);
const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 600000 });
  const text = (r.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
  if (r.isError) throw new Error(`${name}: ${text}`);
  return { text, images: (r.content ?? []).filter((c) => c.type === "image") };
};
const INITIAL = {
  browListen: { opacity: 0 }, browThink: { opacity: 0 }, lids: { opacity: 0, scaleY: 0.05 },
  mouth: { opacity: 0, scaleY: 0.2 }, accWaves: { opacity: 0 }, accDots: { opacity: 0 },
  sparkles: { opacity: 0 }, sparkleBurst: { opacity: 0, scaleX: 0.6, scaleY: 0.6 },
};

const imports = [];
for (const [id, [parent, defs, body]] of Object.entries(PARTS)) {
  const [px, py] = abs[parent];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220"><defs>${defs}</defs><g transform="translate(${-px},${-py})">${body}</g></svg>`;
  fs.writeFileSync(`${DIR}/${id}.svg`, svg);
  const r = await call("riv_import_svg", { svgPath: `${DIR}/${id}.svg`, outSpec: `${DIR}/${id}.scene.json`, idPrefix: `${id}_` });
  const warn = r.text.split("\n").filter((l) => l.startsWith("warnings"));
  if (warn.length) console.log(id, warn.join(" ").slice(0, 160));
  imports.push({ spec: `${DIR}/${id}.scene.json`, id, x: 0, y: 0, parent });
}

const groups = G.map(([id, parent, x, y, extra]) => {
  const [ppx, ppy] = parent ? abs[parent] : [-OFFSET[0], -OFFSET[1]];
  return { id, x: x - ppx, y: y - ppy, ...(parent ? { parent } : {}), ...(extra ?? {}), ...(extra?.solo ? { active: "eyesOpen" } : {}), ...(INITIAL[id] ?? {}) };
});

const scene = { artboard: { name: "KakPinta", width: 240, height: 256 }, groups, imports, animations, stateMachine };
fs.writeFileSync(join(DIR, "scene.json"), JSON.stringify(scene, null, 1));
const r = await call("riv_create", { outPath: OUT, scene, previewTime: 0.5 });
console.log(r.text);
for (const [i, img] of r.images.entries()) fs.writeFileSync(join(DIR, `preview-${i}.png`), Buffer.from(img.data, "base64"));
await client.close();
