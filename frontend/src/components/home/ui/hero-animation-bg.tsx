'use client';

import { motion } from 'framer-motion';
import type { TargetAndTransition } from 'framer-motion';
import { useEffect, useState, useId } from 'react';

type Tone = 'light' | 'medium' | 'dark';
type CSSVar = React.CSSProperties & { ['--blur']?: string };

const LeftArc = ({
    size,
    tone,
    opacity,
    style,
    className,
}: {
    size: number;
    tone: Tone;
    opacity: number; // 0.22–0.38
    style?: CSSVar;
    className?: string;
}) => {
    const uid = useId();
    const sw = 542;
    const sh = 520;
    const isSmallShape = size <= 400;

    const { c1, c2, c3 } =
        {
            light: { c1: '#D9D9D9', c2: '#DEDEDE', c3: '#3B3B3B' },
            medium: { c1: '#C9C9C9', c2: '#D4D4D4', c3: '#2F2F2F' },
            dark: { c1: '#B9B9B9', c2: '#C8C8C8', c3: '#232323' },
        }[tone];

    const d =
        'M541.499 151.597C249.646 151.597 13.0527 388.191 13.0527 680.043H-138.506C-138.506 304.487 165.943 0.0385742 541.499 0.0385742V151.597Z';

    return (
        <svg
            width={size}
            height={size * (sh / sw)}
            viewBox="-50 -50 642 620"
            fill="none"
            className={className}
            style={{ overflow: 'visible', ...style }} // prevent blur cut-off
        >
            <defs>
                <linearGradient id={`L0_${tone}_${uid}`} x1="201.497" y1="0.0386" x2="201.497" y2="680.043" gradientUnits="userSpaceOnUse">
                    <stop stopColor={c1} />
                    <stop offset="1" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`L1_${tone}_${uid}`} x1="541.499" y1="401.469" x2="-138.506" y2="401.469" gradientUnits="userSpaceOnUse">
                    <stop stopColor={c2} />
                    <stop offset="1" stopColor={c3} />
                </linearGradient>

                <filter id={`Ledge_${uid}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" />
                </filter>

                {/* Enhanced blur filter for small shapes */}
                {isSmallShape && (
                    <filter id={`LenhancedBlur_${uid}`} x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="15" />
                    </filter>
                )}

                <mask id={`Lmask_${uid}`} maskUnits="userSpaceOnUse">
                    <g filter={`url(#Ledge_${uid})`}>
                        <path d={d} fill="#fff" />
                    </g>
                </mask>

                <pattern id={`Lgrain_${uid}`} patternUnits="userSpaceOnUse" width="100" height="100">
                    <image href="/grain-texture.png" x="0" y="0" width="100" height="100" preserveAspectRatio="none" />
                </pattern>
            </defs>

            <g opacity={opacity}>
                <g style={{ filter: `blur(var(--blur, 0px))${isSmallShape ? ` url(#LenhancedBlur_${uid})` : ''}` } as CSSVar}>
                    <path d={d} fill={`url(#L0_${tone}_${uid})`} />
                    <path d={d} fill={`url(#L1_${tone}_${uid})`} />
                </g>

                <g mask={`url(#Lmask_${uid})`} style={{ mixBlendMode: 'overlay' }} opacity={0.6} pointerEvents="none">
                    <rect x="0" y="0" width="120%" height="120%" fill={`url(#Lgrain_${uid})`} />
                </g>
            </g>
        </svg>
    );
};

const RightArc = ({
    size,
    tone,
    opacity,
    style,
    className,
}: {
    size: number;
    tone: Tone;
    opacity: number; // 0.22–0.38
    style?: CSSVar;
    className?: string;
}) => {
    const uid = useId();
    const sw = 532;
    const sh = 657;
    const isSmallShape = size <= 400;
    const c = { light: '#D9D9D9', medium: '#C9C9C9', dark: '#B9B9B9' }[tone];

    const d =
        'M3.50098 155.457C378.985 155.457 683.375 459.847 683.375 835.331H834.934C834.934 376.144 462.688 3.89844 3.50098 3.89844V155.457Z';

    return (
        <svg
            width={size}
            height={size * (sh / sw)}
            viewBox="-50 -50 632 757"
            fill="none"
            className={className}
            style={{ overflow: 'visible', ...style }} // prevent blur cut-off
        >
            <defs>
                <linearGradient id={`R0_${tone}_${uid}`} x1="419.217" y1="3.89844" x2="419.217" y2="835.331" gradientUnits="userSpaceOnUse">
                    <stop stopColor={c} />
                    <stop offset="1" stopOpacity="0" />
                </linearGradient>

                <filter id={`Redge_${uid}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" />
                </filter>

                {/* Enhanced blur filter for small shapes */}
                {isSmallShape && (
                    <filter id={`RenhancedBlur_${uid}`} x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="15" />
                    </filter>
                )}

                <mask id={`Rmask_${uid}`} maskUnits="userSpaceOnUse">
                    <g filter={`url(#Redge_${uid})`}>
                        <path d={d} fill="#fff" />
                    </g>
                </mask>

                <pattern id={`Rgrain_${uid}`} patternUnits="userSpaceOnUse" width="100" height="100">
                    <image href="/grain-texture.png" x="0" y="0" width="100" height="100" preserveAspectRatio="none" />
                </pattern>
            </defs>

            <g opacity={opacity}>
                <g style={{ filter: `blur(var(--blur, 0px))${isSmallShape ? ` url(#LenhancedBlur_${uid})` : ''}` } as CSSVar}>
                    <path d={d} fill={`url(#R0_${tone}_${uid})`} />
                </g>

                <g mask={`url(#Rmask_${uid})`} style={{ mixBlendMode: 'overlay' }} opacity={0.6} pointerEvents="none">
                    <rect x="0" y="0" width="120%" height="120%" fill={`url(#Rgrain_${uid})`} />
                </g>
            </g>
        </svg>
    );
};

type ArcCfg = {
    pos: { left?: number; right?: number; top: number };
    size: number;
    tone: Tone;
    opacity: number; // 0.22–0.38
    delay: number;
    x: number[];
    y: number[];
    scale: number[];
    blur: string[]; // DOF: more blur when smaller
};

const Arc = ({ left, cfg }: { left?: boolean; cfg: ArcCfg }) => {
    const stylePos: React.CSSProperties = {
        left: cfg.pos.left,
        right: cfg.pos.right,
        top: cfg.pos.top,
    };

    // FIX TS2590: precompute initial/animate and cast to TargetAndTransition (Framer's accepted type)
    const initialKV = {
        x: 0,
        y: 0,
        scale: cfg.scale[0],
        ['--blur']: cfg.blur[0],
    } as unknown as TargetAndTransition;

    const animateKV = {
        x: cfg.x,
        y: cfg.y,
        scale: cfg.scale,
        ['--blur']: cfg.blur,
    } as unknown as TargetAndTransition;

    return (
        <motion.div
            className="absolute"
            style={stylePos}
            initial={initialKV}
            animate={animateKV}
            transition={{ duration: 4.6, delay: cfg.delay, ease: [0.85, 0, 0.06, 1.01], repeat: Infinity, repeatType: 'loop', times: [0, 0.33, 0.66, 1] }}
        >
            {left ? (
                <LeftArc size={cfg.size} tone={cfg.tone} opacity={cfg.opacity} />
            ) : (
                <RightArc size={cfg.size} tone={cfg.tone} opacity={cfg.opacity} />
            )}
        </motion.div>
    );
};

export function HeroAnimationBg() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    const left: ArcCfg[] = [
        {
            pos: { left: -190, top: 20 },
            size: 400,
            tone: 'light',
            opacity: 0.1,
            delay: 0.02,
            x: [0, 20, -10, 0],
            y: [0, 15, -8, 0],
            scale: [0.78, 1.1, 0.9, 0.78],
            blur: ['19px', '500px', '50px', '500px'],
        },
        {
            pos: { left: -60, top: 240 },
            size: 600,
            tone: 'dark',
            opacity: 0.22,
            delay: 1.1,
            x: [0, 22, -14, 0],
            y: [0, 16, -12, 0],
            scale: [0.82, 1.15, 0.95, 0.82],
            blur: ['1px', '0px', '0', '1px'],
        },
    ];

    const right: ArcCfg[] = [

        {
            pos: { right: -85, top: 100 },
            size: 620,
            tone: 'dark',
            opacity: 0.23,
            delay: 1.5,
            x: [0, -25, 15, 0],
            y: [0, 18, -12, 0],
            scale: [0.84, 1.2, 1.0, 0.84],
            blur: ['1px', '0px', '0px', '1px'],
        },
        {
            pos: { right: -0, top: 570 },
            size: 220,
            tone: 'light',
            opacity: 0.08,
            delay: 0.3,
            x: [0, -20, 10, 0],
            y: [0, 15, -8, 0],
            scale: [0.8, 1.1, 0.9, 0.8],
            blur: ['500px', '500px', '500px', '500px'],
        },
    ];

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            <div className="absolute inset-0">
                {left.map((cfg, i) => (
                    <Arc key={`L${i}`} left cfg={cfg} />
                ))}
                {right.map((cfg, i) => (
                    <Arc key={`R${i}`} cfg={cfg} />
                ))}
            </div>
        </div>
    );
}
