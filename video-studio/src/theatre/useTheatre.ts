import { useEffect, useState } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { ISheet, ISheetObject, UnknownShorthandCompoundProps } from "@theatre/core";

const lastTime = new WeakMap<ISheet, number>();

/**
 * Returns the Theatre.js object's values at the current Remotion frame.
 * Remotion's frame drives the Theatre playhead; edits made in Theatre Studio
 * re-render immediately.
 */
export function useTheatre<Props extends UnknownShorthandCompoundProps>(
  obj: ISheetObject<Props>,
): ISheetObject<Props>["value"] {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [, rerender] = useState(0);

  useEffect(() => obj.onValuesChange(() => rerender((n) => n + 1)), [obj]);

  // Only move the playhead when Remotion's frame changes, so scrubbing the
  // Theatre timeline in the studio is not overridden.
  const time = frame / fps;
  const sheet = obj.sheet;
  if (lastTime.get(sheet) !== time) {
    lastTime.set(sheet, time);
    sheet.sequence.position = time;
  }
  return obj.value;
}
