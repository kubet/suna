'use client';

import { Presentation, Code, Shield, Headphones } from 'lucide-react';

const workers = [
  { title: 'Presenter', desc: 'Tell the AI Worker what job you want it to do.', icon: Presentation, iconBg: '#FFD2D2', iconColor: '#B91C1C' },
  { title: 'Developer', desc: 'Tell the AI Worker what job you want it to do.', icon: Code, iconBg: '#F5DEBA', iconColor: '#B45309' },
  { title: 'Code Expert', desc: 'Tell the AI Worker what job you want it to do.', icon: Shield, iconBg: '#CFE1FF', iconColor: '#1D4ED8' },
  { title: 'Support', desc: 'Tell the AI Worker what job you want it to do.', icon: Headphones, iconBg: '#B4E4BE', iconColor: '#059669' }
];

export function AIWorkerSection() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-4">Pick Your AI Worker</h2>
        <p className="text-lg text-gray-600 mb-12 max-w-3xl mx-auto">
          Create an AI Worker that can handle tasks for you — from emails to reports — in just a few minutes.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {workers.map((w, i) => (
            <div key={i} className="bg-white/70 border border-gray-200 rounded-3xl p-6 hover:shadow-md transition-shadow text-left">
              <div 
                className="w-[65px] h-[65px] rounded-[22px] flex items-center justify-center mb-4 relative overflow-hidden"
                style={{ backgroundColor: w.iconBg }}
              >
                <div 
                  className="absolute inset-0 opacity-30 mix-blend-overlay"
                  style={{ 
                    backgroundImage: 'url(/grain-texture.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <w.icon className="w-6 h-6 relative z-10" style={{ color: w.iconColor }} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{w.title}</h3>
              <p className="text-sm text-gray-600">{w.desc}</p>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {workers.map((w, i) => (
            <div key={`${i}-2`} className="bg-white/70 border border-gray-200 rounded-3xl p-6 hover:shadow-md transition-shadow text-left">
              <div 
                className="w-[65px] h-[65px] rounded-[22px] flex items-center justify-center mb-4 relative overflow-hidden"
                style={{ backgroundColor: w.iconBg }}
              >
                <div 
                  className="absolute inset-0 opacity-30 mix-blend-overlay"
                  style={{ 
                    backgroundImage: 'url(/grain-texture.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <w.icon className="w-6 h-6 relative z-10" style={{ color: w.iconColor }} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{w.title}</h3>
              <p className="text-sm text-gray-600">{w.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
