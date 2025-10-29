'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function AnimatedBrandmark() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const pathD = "M78.9989 0.527344C79.2406 93.2729 146.704 170.569 236.289 188.394L236.887 188.513V0.527344H314.645V188.515L315.245 188.394C404.407 170.253 472.289 92.9849 472.533 0.527344H550.303C550.121 97.8051 496.921 182.937 417.413 229.808L416.682 230.238L417.413 230.669C496.922 277.54 550.123 362.671 550.305 459.948H472.535C472.293 367.202 404.829 289.906 315.243 272.082L314.645 271.963V460.033H236.887V271.964L236.289 272.082C146.704 289.907 79.2387 367.203 78.9969 459.948H1.22742C1.40921 362.671 54.6109 277.54 134.12 230.669L134.85 230.238L134.12 229.808C54.6116 182.937 1.41109 97.8051 1.22937 0.527344H78.9989Z";

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 w-[1000px] h-[833px]">
      <motion.div
        className="relative w-full h-full"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 1.8,
          ease: [0.19, 1, 0.22, 1],
        }}
      >
        {/* Glow layer - only shows after both waves complete */}
        <svg
          width="1000"
          height="833"
          viewBox="0 0 554 462"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0"
          style={{
            filter: 'blur(25px)',
          }}
        >
          <path
            d={pathD}
            stroke="currentColor"
            strokeWidth="5"
            className="text-foreground"
          >
            <animate
              attributeName="stroke-opacity"
              values="0;0;0;0.5;0;0"
              dur="10s"
              repeatCount="indefinite"
              keyTimes="0;0.55;0.63;0.68;0.73;1"
            />
          </path>
        </svg>

        {/* Main SVG with tracer and flash effect */}
        <svg
          width="1000"
          height="833"
          viewBox="0 0 554 462"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0"
        >
          <defs>
            {/* Base dim stroke - stays minimal */}
            <linearGradient id="baseStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.03" />
              <stop offset="50%" stopColor="currentColor" stopOpacity="0.05" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.03" />
            </linearGradient>

            {/* Energy trail for left tracer - super minimal */}
            <linearGradient id="tracer1Trail" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="5%" stopColor="currentColor" stopOpacity="0.01">
                <animate
                  attributeName="offset"
                  values="-0.25;-0.25;0.75;0.75;0.75;0.75;0.75;-0.25"
                  dur="10s"
                  repeatCount="indefinite"
                  keyTimes="0;0.05;0.3;0.35;0.6;0.75;0.8;1"
                />
              </stop>
              <stop offset="50%" stopColor="currentColor" stopOpacity="0">
                <animate
                  attributeName="offset"
                  values="-0.2;-0.2;0.8;0.8;0.8;0.8;0.8;-0.2"
                  dur="10s"
                  repeatCount="indefinite"
                  keyTimes="0;0.05;0.3;0.35;0.6;0.75;0.8;1"
                />
              </stop>
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>

            {/* Energy trail for right tracer - super minimal */}
            <linearGradient id="tracer2Trail" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="5%" stopColor="currentColor" stopOpacity="0.01">
                <animate
                  attributeName="offset"
                  values="-0.25;-0.25;-0.25;-0.25;0.75;0.75;0.75;-0.25"
                  dur="10s"
                  repeatCount="indefinite"
                  keyTimes="0;0.25;0.35;0.4;0.6;0.65;0.8;1"
                />
              </stop>
              <stop offset="50%" stopColor="currentColor" stopOpacity="0">
                <animate
                  attributeName="offset"
                  values="-0.2;-0.2;-0.2;-0.2;0.8;0.8;0.8;-0.2"
                  dur="10s"
                  repeatCount="indefinite"
                  keyTimes="0;0.25;0.35;0.4;0.6;0.65;0.8;1"
                />
              </stop>
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>

            {/* Tracer 1 - left wave (0-2.5s) */}
            <linearGradient id="tracer1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="2%" stopColor="currentColor" stopOpacity="0.3">
                <animate
                  attributeName="offset"
                  values="-0.02;-0.02;1.02;1.02;1.02;1.02;1.02;-0.02"
                  dur="10s"
                  repeatCount="indefinite"
                  keyTimes="0;0.05;0.3;0.35;0.6;0.75;0.8;1"
                />
              </stop>
              <stop offset="5%" stopColor="currentColor" stopOpacity="1">
                <animate
                  attributeName="offset"
                  values="-0.05;-0.05;1.05;1.05;1.05;1.05;1.05;-0.05"
                  dur="10s"
                  repeatCount="indefinite"
                  keyTimes="0;0.05;0.3;0.35;0.6;0.75;0.8;1"
                />
              </stop>
              <stop offset="8%" stopColor="currentColor" stopOpacity="0.4">
                <animate
                  attributeName="offset"
                  values="-0.08;-0.08;1.08;1.08;1.08;1.08;1.08;-0.08"
                  dur="10s"
                  repeatCount="indefinite"
                  keyTimes="0;0.05;0.3;0.35;0.6;0.75;0.8;1"
                />
              </stop>
              <stop offset="12%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>

            {/* Tracer 2 - right wave (3-5.5s) - EXTRA VISIBLE */}
            <linearGradient id="tracer2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="2%" stopColor="currentColor" stopOpacity="0.3">
                <animate
                  attributeName="offset"
                  values="-0.02;-0.02;-0.02;-0.02;1.02;1.02;1.02;-0.02"
                  dur="10s"
                  repeatCount="indefinite"
                  keyTimes="0;0.25;0.35;0.4;0.6;0.65;0.8;1"
                />
              </stop>
              <stop offset="5%" stopColor="currentColor" stopOpacity="1">
                <animate
                  attributeName="offset"
                  values="-0.05;-0.05;-0.05;-0.05;1.05;1.05;1.05;-0.05"
                  dur="10s"
                  repeatCount="indefinite"
                  keyTimes="0;0.25;0.35;0.4;0.6;0.65;0.8;1"
                />
              </stop>
              <stop offset="8%" stopColor="currentColor" stopOpacity="0.45">
                <animate
                  attributeName="offset"
                  values="-0.08;-0.08;-0.08;-0.08;1.08;1.08;1.08;-0.08"
                  dur="10s"
                  repeatCount="indefinite"
                  keyTimes="0;0.25;0.35;0.4;0.6;0.65;0.8;1"
                />
              </stop>
              <stop offset="12%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>

            {/* Flash - whole path lights up when tracers complete */}
            <linearGradient id="flashGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
              <stop offset="50%" stopColor="currentColor" stopOpacity="0.6" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          <g className="text-foreground">
            {/* Base subtle stroke - always visible */}
            <path
              d={pathD}
              stroke="url(#baseStroke)"
              strokeWidth="0.8"
              strokeLinecap="round"
            />

            {/* Energy trail for tracer 1 - follows behind */}
            <path
              d={pathD}
              stroke="url(#tracer1Trail)"
              strokeWidth="0.8"
              strokeLinecap="round"
            />

            {/* Energy trail for tracer 2 - follows behind */}
            <path
              d={pathD}
              stroke="url(#tracer2Trail)"
              strokeWidth="0.8"
              strokeLinecap="round"
            />

            {/* Tracer 1 layer - thicker and more visible */}
            <path
              d={pathD}
              stroke="url(#tracer1)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Tracer 2 layer - thicker and more visible */}
            <path
              d={pathD}
              stroke="url(#tracer2)"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Flash layer - entire path lights up after both tracers complete */}
            <path
              d={pathD}
              stroke="url(#flashGradient)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <animate
                attributeName="stroke-opacity"
                values="0;0;0;0.35;0;0"
                dur="10s"
                repeatCount="indefinite"
                keyTimes="0;0.55;0.63;0.68;0.73;1"
              />
            </path>

            {/* Bright flash overlay - max brightness */}
            <path
              d={pathD}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <animate
                attributeName="stroke-opacity"
                values="0;0;0;0.45;0;0"
                dur="10s"
                repeatCount="indefinite"
                keyTimes="0;0.55;0.64;0.68;0.72;1"
              />
            </path>
          </g>
        </svg>
      </motion.div>
    </div>
  );
}
