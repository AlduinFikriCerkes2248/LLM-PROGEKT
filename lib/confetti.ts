"use client";

import confetti from "canvas-confetti";

export function fireGoldJackpotConfetti() {
  if (typeof window === "undefined") return;
  try {
    confetti({
      particleCount: 75,
      spread: 75,
      origin: { y: 0.6 },
      colors: ["#fbbf24", "#f59e0b", "#fde68a", "#ffffff"],
    });
    setTimeout(() => {
      confetti({
        particleCount: 45,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ["#fbbf24", "#08bfea", "#fde68a"],
      });
      confetti({
        particleCount: 45,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: ["#fbbf24", "#08bfea", "#fde68a"],
      });
    }, 180);
  } catch {}
}

export function fireWinterFrostConfetti() {
  if (typeof window === "undefined") return;
  try {
    confetti({
      particleCount: 80,
      spread: 85,
      origin: { y: 0.55 },
      colors: ["#bae6fd", "#38bdf8", "#ffffff", "#e0f2fe", "#fbbf24"],
      gravity: 0.8,
      scalar: 1.05,
    });
  } catch {}
}

export function fireVictoryConfetti() {
  if (typeof window === "undefined") return;
  try {
    confetti({
      particleCount: 65,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#08bfea", "#ff7a24", "#10b981", "#fbbf24"],
    });
  } catch {}
}
