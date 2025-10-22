'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export function NewFooterSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const mouseRef = useRef({ x: 9999, y: 9999, vx: 0, vy: 0 });
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const [particleCount, setParticleCount] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        rendererRef.current = renderer;

        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);

        camera.position.z = 80;

        let animationId: number;

        // Load and parse SVG
        fetch('/Wordmark.svg')
            .then(response => response.text())
            .then(svgText => {
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
                const svgElement = svgDoc.documentElement;

                const g = svgElement.querySelector('g');
                if (g) g.removeAttribute('opacity');

                const svgBlob = new Blob([new XMLSerializer().serializeToString(svgElement)], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(svgBlob);

                const img = new Image();
                img.onload = () => {
                    URL.revokeObjectURL(url);

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (!ctx) return;

                    canvas.width = 1150;
                    canvas.height = 344;

                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    const particles: THREE.Vector3[] = [];
                    const originalPositions: THREE.Vector3[] = [];
                    const particleOpacities: number[] = [];
                    const particleSizes: number[] = [];

                    const step = 2;
                    for (let y = 0; y < canvas.height; y += step) {
                        for (let x = 0; x < canvas.width; x += step) {
                            const index = (y * canvas.width + x) * 4;
                            const r = imageData.data[index];
                            const g = imageData.data[index + 1];
                            const b = imageData.data[index + 2];
                            const brightness = (r + g + b) / 3;

                            if (brightness < 250) {
                                const noiseX = (Math.random() - 0.5) * 2.0;
                                const noiseY = (Math.random() - 0.5) * 2.0;
                                const px = (x - canvas.width / 2) * 0.22 + noiseX;
                                const py = -(y - canvas.height / 2) * 0.22 + noiseY;
                                particles.push(new THREE.Vector3(px, py, 0));
                                originalPositions.push(new THREE.Vector3(px, py, 0));

                                // Random opacity for noise effect
                                particleOpacities.push(0.3 + Math.random() * 0.5);
                                // Random size for noise variation
                                particleSizes.push(1.0 + Math.random() * 2.0);
                            }
                        }
                    }

                    console.log(`Created ${particles.length} particles`);
                    setParticleCount(particles.length);

                    if (particles.length === 0) return;

                    const geometry = new THREE.BufferGeometry();
                    const positions = new Float32Array(particles.length * 3);
                    const opacities = new Float32Array(particles.length);
                    const sizes = new Float32Array(particles.length);

                    particles.forEach((p, i) => {
                        positions[i * 3] = p.x;
                        positions[i * 3 + 1] = p.y;
                        positions[i * 3 + 2] = p.z;
                        opacities[i] = particleOpacities[i];
                        sizes[i] = particleSizes[i];
                    });

                    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
                    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

                    // Custom shader for varying opacity and size
                    const material = new THREE.ShaderMaterial({
                        uniforms: {},
                        vertexShader: `
                            attribute float opacity;
                            attribute float size;
                            varying float vOpacity;
                            
                            void main() {
                                vOpacity = opacity;
                                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                                gl_PointSize = size;
                                gl_Position = projectionMatrix * mvPosition;
                            }
                        `,
                        fragmentShader: `
                            varying float vOpacity;
                            
                            void main() {
                                float dist = length(gl_PointCoord - vec2(0.5));
                                if (dist > 0.5) discard;
                                gl_FragColor = vec4(1.0, 1.0, 1.0, vOpacity);
                            }
                        `,
                        transparent: true,
                    });

                    const points = new THREE.Points(geometry, material);
                    scene.add(points);

                    const animate = () => {
                        animationId = requestAnimationFrame(animate);

                        const positions = geometry.attributes.position.array as Float32Array;
                        const velocity = Math.sqrt(mouseRef.current.vx ** 2 + mouseRef.current.vy ** 2);

                        for (let i = 0; i < particles.length; i++) {
                            const original = originalPositions[i];
                            const currentX = positions[i * 3];
                            const currentY = positions[i * 3 + 1];

                            if (velocity > 0.1) {
                                const dx = currentX - mouseRef.current.x;
                                const dy = currentY - mouseRef.current.y;
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                const repelRadius = 25;

                                if (distance < repelRadius && distance > 0.1) {
                                    const repelForce = Math.pow((1 - distance / repelRadius), 2) * velocity * 0.8;
                                    positions[i * 3] += (dx / distance) * repelForce;
                                    positions[i * 3 + 1] += (dy / distance) * repelForce;
                                }
                            }

                            positions[i * 3] += (original.x - positions[i * 3]) * 0.15;
                            positions[i * 3 + 1] += (original.y - positions[i * 3 + 1]) * 0.15;
                        }

                        // Decay velocity
                        mouseRef.current.vx *= 0.85;
                        mouseRef.current.vy *= 0.85;

                        geometry.attributes.position.needsUpdate = true;
                        renderer.render(scene, camera);
                    };

                    animate();
                };

                img.src = url;
            })
            .catch(err => console.error('Failed to load SVG:', err));

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();

            // Convert mouse position to world coordinates
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Map to normalized device coordinates (-1 to 1)
            const x = (mouseX / rect.width) * 2 - 1;
            const y = -(mouseY / rect.height) * 2 + 1;

            // Project to world space based on camera position and FOV
            const distance = camera.position.z;
            const vFOV = (camera.fov * Math.PI) / 180;
            const height = 2 * Math.tan(vFOV / 2) * distance;
            const width = height * camera.aspect;

            const newX = x * (width / 2);
            const newY = y * (height / 2);

            // Calculate velocity (movement delta)
            mouseRef.current.vx = newX - mouseRef.current.x;
            mouseRef.current.vy = newY - mouseRef.current.y;

            mouseRef.current.x = newX;
            mouseRef.current.y = newY;
        };

        const handleMouseLeave = () => {
            mouseRef.current.x = 9999;
            mouseRef.current.y = 9999;
            mouseRef.current.vx = 0;
            mouseRef.current.vy = 0;
        };

        const handleResize = () => {
            if (!container || !rendererRef.current) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            rendererRef.current.setSize(container.clientWidth, container.clientHeight);
        };

        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationId);
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('resize', handleResize);
            if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
                container.removeChild(rendererRef.current.domElement);
            }
            rendererRef.current?.dispose();
        };
    }, []);

    return (
        <footer className="w-full bg-background py-20">
            <div className="w-full mx-auto max-w-[1600px] px-6">
                <div
                    ref={containerRef}
                    className="w-full h-[32rem] relative"
                />
            </div>
        </footer>
    );
}
