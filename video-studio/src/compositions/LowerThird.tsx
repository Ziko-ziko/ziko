import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// Transparent background: render with ProRes 4444 (npm run render:lowerthird)
// and drop it on top of any footage in your editor or with scripts/overlay.sh.
export const LowerThird: React.FC<{ name: string; role: string }> = ({ name, role }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const leave = spring({ frame: frame - (durationInFrames - 20), fps, config: { damping: 200 } });
  const progress = enter - leave;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", padding: 100, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <div style={{ width: 12, background: "#ff3d6e", transform: `scaleY(${progress})` }} />
        <div
          style={{
            background: "rgba(10,10,20,0.85)",
            padding: "20px 36px",
            clipPath: `inset(0 ${100 - progress * 100}% 0 0)`,
          }}
        >
          <div style={{ color: "white", fontSize: 56, fontWeight: 800 }}>{name}</div>
          <div
            style={{
              color: "#ff9db5",
              fontSize: 32,
              opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" }),
            }}
          >
            {role}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
