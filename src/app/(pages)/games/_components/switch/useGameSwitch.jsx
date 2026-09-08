"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

import { canSwitch } from "@/lib/realtime/switching";

import { presentation, switchOptions } from "./catalog";
import SwitchInterstitial from "./SwitchInterstitial";

/**
 * The wiring every online game needs to take part in a switch, so each game's
 * own edit stays two lines.
 *
 * @param {object} opts
 * @param {?object} opts.room        the room payload from `useRoom`
 * @param {string}  opts.code        the room code
 * @param {string}  opts.currentGame this page's registry id
 * @param {(to: string) => Promise<object>} opts.switchTo `useRoom().switchTo`
 *
 * @returns {{ interstitial: ?JSX.Element, switcher: ?object }}
 *   `interstitial` is non-null the instant this room stops being this game —
 *   render it before every other branch, so a switched room never flashes the
 *   old lobby. `switcher` is the props object for `<GameSwitcher>`, or null
 *   when there is no control to draw (not your call, or nothing qualifies).
 */
export const useGameSwitch = ({ code, currentGame, room, switchTo }) => {
  const router = useRouter();

  // `room` is null on the server render and on the first client render — it
  // only exists once `bootstrap()` resolves — so this comparison can never
  // appear in prerendered markup and cannot cause a hydration mismatch.
  const target = useMemo(
    () => (room && room.game !== currentGame ? presentation(room.game) : null),
    [currentGame, room],
  );

  // Fired once. A second `replace` onto the same route is harmless but the ref
  // also covers the render between the call and the new page mounting.
  const navigated = useRef(false);

  useEffect(() => {
    if (!target || navigated.current) return;
    navigated.current = true;

    // A SOFT navigation, and `replace` rather than `push`.
    //
    // Soft, because a hard one (`window.location`, an `<a href>`) fires
    // `pagehide`, which fires `useRoom`'s `sendBeacon` leave — announcing that
    // you left the room you are joining, racing your own re-join. In a lobby
    // that beacon DELETES the seat, so the host would come back as the last
    // seat and lose the room.
    //
    // `replace`, because the entry left behind is `/games/<old>?room=CODE`, and
    // Back onto it would re-join, re-detect the mismatch and bounce forward
    // again — a loop with no way out.
    router.replace(`${target.href}?room=${encodeURIComponent(code)}`);
  }, [code, router, target]);

  const switcher = useMemo(() => {
    if (!room || !canSwitch(room)) return null;
    // `canSwitch` is the rule; this is only "we have artwork and a route for
    // it", so a registry game with no presentation entry is quietly not offered
    // rather than opening an empty picker.
    if (switchOptions(room).length === 0) return null;
    return { room, onSwitch: switchTo };
  }, [room, switchTo]);

  return {
    interstitial: target ? (
      <SwitchInterstitial code={code} to={target} />
    ) : null,
    switcher,
  };
};

export default useGameSwitch;
