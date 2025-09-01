'use client';

import { Presentation, Code, Shield, Headphones } from 'lucide-react';
import { GrainText } from '@/components/ui/grain-text';
import React, { useRef, useEffect, useState } from 'react';

const workers = [
  { title: 'Presenter', desc: 'Tell the AI Worker what job you want it to do.', icon: Presentation, iconBg: '#FFD2D2', iconColor: '#B91C1C' },
  { title: 'Developer', desc: 'Tell the AI Worker what job you want it to do.', icon: Code, iconBg: '#F5DEBA', iconColor: '#B45309' },
  { title: 'Code Expert', desc: 'Tell the AI Worker what job you want it to do.', icon: Shield, iconBg: '#CFE1FF', iconColor: '#1D4ED8' },
  { title: 'Support', desc: 'Tell the AI Worker what job you want it to do.', icon: Headphones, iconBg: '#B4E4BE', iconColor: '#059669' }
];

function InfiniteCarousel({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrolling, setScrolling] = useState(true);

  // Create many copies for truly infinite scrolling
  const items = React.Children.toArray(children);
  const allItems = Array(20).fill(items).flat(); // Create 20 copies for smooth infinite scroll

  useEffect(() => {
    if (!scrolling) return;
    const container = containerRef.current;
    if (!container) return;
    let frame: number;
    const speed = 1; // px per frame

    function step() {
      if (!container) return;
      container.scrollLeft += speed;

      // Reset scroll for infinite effect - when we've scrolled past 1/4 of total width
      const resetPoint = container.scrollWidth / 4;
      if (container.scrollLeft >= resetPoint) {
        container.scrollLeft = 0;
      }
      frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [scrolling]);

  return (
    <div
      ref={containerRef}
      className="flex overflow-x-auto no-scrollbar whitespace-nowrap"
      style={{ WebkitOverflowScrolling: 'touch' }}
      onMouseEnter={() => setScrolling(false)}
      onMouseLeave={() => setScrolling(true)}
    >
      {allItems.map((child, i) => (
        <div key={i} className="inline-block">
          {child}
        </div>
      ))}
    </div>
  );
}
export function AIWorkerSection() {
  return (
    <section className="py-16 px-0 w-full">
      <div className="w-full text-center">
        <div className=''>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-medium tracking-tighter text-balance text-center p-2">
            Pick Your AI Worker
          </h2>
          <GrainText
            className="text-lg w-full text-center text-gray-600 break-words whitespace-pre-line"
            grainOpacity={100}
          >
            Create an AI Worker that can handle tasks for you — from emails to reports — in just a few minutes.
          </GrainText>
        </div>
        <div className="w-full mt-20">
          <InfiniteCarousel>
            {workers.map((w, i) => (
              <div
                key={i}
                className="bg-white/70 border border-gray-200 rounded-[24px] w-[278px] h-[340px] p-6 mx-3 flex flex-col items-center justify-start shadow-sm hover:shadow-md transition-shadow text-left"
                style={{ minWidth: 278, maxWidth: 278 }}
              >
                <div
                  className="w-full flex items-center justify-center mb-6"
                >
                  <div
                    className="rounded-[24px] w-full flex items-center justify-center relative overflow-hidden"
                    style={{
                      backgroundColor: w.iconBg,
                      height: 128,
                    }}
                  >
                    <w.icon className="relative z-10" style={{ color: w.iconColor, width: 53, height: 53 }} />
                    <div
                      className="absolute inset-0 z-20 pointer-events-none"
                      style={{
                        backgroundImage: 'url(/grain-texture.png)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'repeat',
                        opacity: 1,
                        mixBlendMode: 'overlay',
                      }}
                    />
                  </div>
                </div>
                <h3 className="text-[24px] font-medium mb-2 w-full text-left">{w.title}</h3>
                <GrainText
                  className="text-[16px] w-full text-left text-gray-600 break-words whitespace-pre-line"
                  grainOpacity={100}
                >
                  {w.desc}
                </GrainText>
              </div>
            ))}
          </InfiniteCarousel>
        </div>
      </div>
    </section>
  );
}
