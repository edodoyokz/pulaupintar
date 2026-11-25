import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Alignment, Fit, RiveView, useRive, useRiveFile, type RiveViewRef } from "@rive-app/react-native";
import { useReducedMotion } from "react-native-reanimated";
import { getAudioLevel } from "@/tutor/live/levels";

/** "calm" is the settled happy pose without the celebration hop, for rest and loading screens. */
export type KakPintaMood = "talk" | "listen" | "think" | "happy" | "calm";

/** A short reaction played over the current mood. */
export type KakPintaReaction = "correct" | "hint" | "reveal";

/** Where Kak Pinta looks: x -1 left .. 1 right, y -1 up .. 1 down. */
export type KakPintaGaze = { x: number; y: number };

export type KakPintaProps = {
  size?: number;
  mood?: KakPintaMood;
  /** Reaction to play; set it back to undefined to re-arm the same reaction for the next item. */
  reaction?: KakPintaReaction;
  gaze?: KakPintaGaze;
};

const FORWARD: KakPintaGaze = { x: 0, y: 0 };
const clampUnit = (value: number) => Math.max(-1, Math.min(1, value));

/** Order matches the mood states in the Rive file. Reduced Motion swaps the celebration for the calm pose. */
const MOOD_VALUE: Record<KakPintaMood, number> = { talk: 0, listen: 1, think: 2, happy: 3, calm: 4 };

/** Artboard size in the .riv file, so the Pressable keeps the same proportions. */
const ARTBOARD = { width: 240, height: 256 };

/**
 * Kak Pinta, the little yellow-crested cockatoo tutor.
 *
 * The character is a Rive state machine: the app sends a mood, a reaction and live voice levels, and
 * the artwork decides how the body moves. Levels come from the real audio graph, so the mouth opens
 * on syllables instead of a canned loop.
 */
export const KakPinta = ({ size = 160, mood = "talk", reaction, gaze = FORWARD }: KakPintaProps) => {
  const reducedMotion = useReducedMotion();
  const { riveFile, error } = useRiveFile(require("../../assets/rive/kak-pinta.riv"));
  const { riveViewRef, setHybridRef } = useRive();
  const [pressed, setPressed] = useState(false);
  const lastReaction = useRef<KakPintaReaction | undefined>(undefined);

  const box = useMemo(
    () => ({ width: size, height: Math.round((size * ARTBOARD.height) / ARTBOARD.width) }),
    [size],
  );

  const view = (riveViewRef ?? null) as RiveViewRef | null;

  useEffect(() => {
    if (!view) return;
    view.setNumberInputValue("mood", reducedMotion && mood === "happy" ? MOOD_VALUE.calm : MOOD_VALUE[mood]);
    view.setBooleanInputValue("reducedMotion", reducedMotion);
  }, [view, mood, reducedMotion]);

  // Eyes point at what the child should look at: the picture card, the microphone, or the child.
  useEffect(() => {
    if (!view) return;
    view.setNumberInputValue("gazeX", clampUnit(gaze.x));
    view.setNumberInputValue("gazeY", clampUnit(gaze.y));
  }, [view, gaze.x, gaze.y]);

  // Clearing the reaction re-arms it, so the next item can react the same way.
  useEffect(() => {
    if (!reaction) {
      lastReaction.current = undefined;
      return;
    }
    if (!view || lastReaction.current === reaction) return;
    lastReaction.current = reaction;
    view.triggerInput(reaction);
  }, [view, reaction]);

  // The mouth follows the tutor's own audio, the crest follows the child's voice.
  useEffect(() => {
    if (!view) return;
    let speech = -1;
    let listen = -1;
    const timer = setInterval(() => {
      const nextSpeech = getAudioLevel("speech");
      const nextListen = getAudioLevel("listen");
      if (nextSpeech !== speech) {
        speech = nextSpeech;
        view.setNumberInputValue("mouthOpen", speech);
      }
      if (nextListen !== listen) {
        listen = nextListen;
        view.setNumberInputValue("listenLevel", listen);
      }
    }, 60);
    return () => clearInterval(timer);
  }, [view]);

  if (error) console.warn("[rive] Kak Pinta failed to load:", error.message);

  return (
    <Pressable
      onPressIn={() => {
        setPressed(true);
        view?.triggerInput("tap");
      }}
      onPressOut={() => setPressed(false)}
      accessibilityRole="image"
      accessibilityLabel="Kak Pinta, si kakatua kecil"
      style={[box, pressed && styles.pressed]}
    >
      {riveFile && (
        <RiveView
          file={riveFile}
          artboardName="KakPinta"
          stateMachineName="KakPinta"
          fit={Fit.Contain}
          alignment={Alignment.Center}
          autoPlay
          hybridRef={setHybridRef}
          style={box}
          onError={(riveError) => console.warn("[rive]", riveError.message)}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.92 },
});
