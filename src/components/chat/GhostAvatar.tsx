// Animated ghost: idle, thinking, speaking, refusing.
// Spec: specs/01 NFR-6
// Task: T2.6

"use client";

import type { AvatarStatus } from "@/lib/ghost/session";

const LABEL: Record<AvatarStatus, string> = {
  idle: "waiting",
  thinking: "thinking",
  speaking: "speaking",
  refusing: "refusing",
};

/** Vesper. Motion lives in globals.css (`.vesper[data-status]`) and is switched off under prefers-reduced-motion. */
export default function GhostAvatar({ status, size = 72 }: { status: AvatarStatus; size?: number }) {
  return (
    <svg
      role="img"
      aria-label={`Vesper is ${LABEL[status]}`}
      className="vesper"
      data-status={status}
      width={size}
      height={size}
      viewBox="0 0 64 64"
    >
      <path
        className="vesper-body"
        d="M10 58V30C10 16 20 6 32 6s22 10 22 24v28l-7-6-7 6-8-6-8 6-7-6z"
        fill="currentColor"
      />
      <g className="vesper-eyes" fill="#0b0908">
        <ellipse cx="24" cy="29" rx="3.2" ry="4.4" />
        <ellipse cx="40" cy="29" rx="3.2" ry="4.4" />
      </g>
      <ellipse className="vesper-mouth" cx="32" cy="42" rx="4" ry="2.6" fill="#0b0908" />
    </svg>
  );
}
