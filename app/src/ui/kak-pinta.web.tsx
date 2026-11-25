import type { KakPintaMood, KakPintaReaction } from "./kak-pinta";

export type { KakPintaMood, KakPintaReaction };

/**
 * Web has no Rive native module, so the tutor is simply absent there. The app is a phone product:
 * this file exists so the Expo web/server export can finish, not to run the character in a browser.
 */
export const KakPinta = (_props: {
  size?: number;
  mood?: KakPintaMood;
  reaction?: KakPintaReaction;
}) => null;
