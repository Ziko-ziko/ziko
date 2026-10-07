// Minimal line-art face used in the B-roll motion graphics.
export const FaceArt: React.FC<{
  size: number;
  stroke?: string;
  lips?: number; // 0..1 highlight
  cheeks?: number;
  outline?: number;
  accent?: string;
  draw?: number; // 0..1 stroke drawing progress
  strokeWidth?: number;
}> = ({ size, stroke = "#f4eef2", lips = 0, cheeks = 0, outline = 0, accent = "#ff3fa4", draw = 1, strokeWidth = 4 }) => {
  const dash = { strokeDasharray: 1000, strokeDashoffset: 1000 * (1 - draw) };
  const common = { fill: "none", stroke, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, ...dash };
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 200 260">
      <path d="M28 120 C 18 45 75 6 112 12 C 165 20 188 70 172 122" {...common} strokeOpacity={0.55} />
      <ellipse cx="62" cy="152" rx="15" ry="9" fill={accent} opacity={cheeks * 0.85} />
      <ellipse cx="138" cy="152" rx="15" ry="9" fill={accent} opacity={cheeks * 0.85} />
      <path
        d="M100 28 C 150 28 170 66 170 114 C 170 168 148 214 100 238 C 52 214 30 168 30 114 C 30 66 50 28 100 28 Z"
        {...common}
        stroke={outline > 0.01 ? accent : stroke}
        strokeWidth={strokeWidth + outline * 3}
      />
      <path d="M58 98 Q75 88 90 96 M110 96 Q125 88 142 98" {...common} />
      <path d="M62 116 Q76 107 90 116 Q76 122 62 116 Z M110 116 Q124 107 138 116 Q124 122 110 116 Z" {...common} />
      <path d="M100 118 L93 162 Q100 168 109 162" {...common} />
      <path
        d="M76 192 Q89 181 100 187 Q111 181 124 192 Q100 214 76 192 Z"
        {...common}
        fill={accent}
        fillOpacity={lips * 0.9}
        stroke={lips > 0.01 ? accent : stroke}
      />
      <path d="M76 192 Q100 197 124 192" {...common} stroke={lips > 0.01 ? "#7a1048" : stroke} />
    </svg>
  );
};
