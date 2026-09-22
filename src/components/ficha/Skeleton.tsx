import type { CSSProperties } from "react";

export function Skeleton({
  className = "",
  style = {},
  width,
  height,
  rounded = "rounded-lg",
}: {
  className?: string;
  style?: CSSProperties;
  width?: string | number;
  height?: string | number;
  rounded?: string;
}) {
  return (
    <div
      className={`shimmer ${rounded} ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? "1rem",
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div
      className="p-5 rounded-2xl border space-y-3"
      style={{
        backgroundColor: "var(--panel)",
        borderColor: "var(--border)",
      }}
    >
      <Skeleton width="40%" height="14px" />
      <Skeleton width="70%" height="28px" />
      <Skeleton width="55%" height="12px" />
    </div>
  );
}
