"use client";

import React, { useEffect, useState } from "react";
import { animate } from "motion/react";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

export default function AnimatedNumber({
  value,
  className = "",
  suffix = "",
  prefix = "",
  duration = 0.65,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const controls = animate(displayValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}
