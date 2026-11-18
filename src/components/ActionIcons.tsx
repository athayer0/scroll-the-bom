import { Path, Polygon, Svg } from 'react-native-svg';

/** Outline action icons in a thin, rounded social-feed style (24×24 grid). */
type IconProps = { size?: number; color: string; filled?: boolean; fillColor?: string };

const STROKE = 1.9;

export function HeartIcon({ size = 30, color, filled, fillColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 20.9C8.6 18.6 2.9 14.7 2.9 9.3c0-3.2 2.3-5.7 5.3-5.7 1.7 0 3.1.9 3.8 2.4.7-1.5 2.1-2.4 3.8-2.4 3 0 5.3 2.5 5.3 5.7 0 5.4-5.7 9.3-9.1 11.6Z"
        fill={filled ? (fillColor ?? color) : 'none'}
        stroke={filled ? (fillColor ?? color) : color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CommentIcon({ size = 30, color, filled, fillColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M20.4 16.7A9.4 9.4 0 1 0 17 20.1l4.6 1.5Z"
        fill={filled ? (fillColor ?? color) : 'none'}
        stroke={filled ? (fillColor ?? color) : color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SendIcon({ size = 30, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M21.5 3.5 9.4 10.2" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      <Polygon
        points="12 20.5 21.5 3.5 2.5 3.5 9.4 10.2 12 20.5"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BookIcon({ size = 30, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 6.6C10 5.1 7 4.6 3 5.1v13.4c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5.1c-4-.5-7 0-9 1.5Zm0 0V20"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}
