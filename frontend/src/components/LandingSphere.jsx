import React, { useEffect, useRef } from 'react';

export default function LandingSphere() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const particles = [];
    const numParticles = 380; // Denser array matrix
    const baseSphereRadius = Math.min(window.innerWidth, window.innerHeight) * 0.32;

    for (let i = 0; i < numParticles; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / numParticles);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      
      particles.push({
        x: Math.cos(theta) * Math.sin(phi),
        y: Math.sin(theta) * Math.sin(phi),
        z: Math.cos(phi),
        baseRadius: Math.random() * 1.8 + 0.6,
        hueShift: Math.random() * 360
      });
    }

    let angleX = 0;
    let angleY = 0;
    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      angleX += 0.0015;
      angleY += 0.0025;
      time += 0.012;

      // Mathematical respiration calculation loop
      const breatheScale = 1.0 + 0.12 * Math.sin(time * 0.6); 
      const currentRadius = baseSphereRadius * breatheScale;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      particles.forEach(p => {
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.z * cosY + p.x * sinY;
        
        let y1 = p.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y * sinX;

        const perspective = 500 / (500 - z2 * currentRadius);
        const px = centerX + x1 * currentRadius * perspective;
        const py = centerY + y1 * currentRadius * perspective;
        
        const depth = (z2 + 1) / 2; 
        const opacity = Math.max(0.08, depth) * 0.55;
        const size = p.baseRadius * perspective;

        // Synchronous global interpolation cycle across HSL color boundaries
        const currentHue = (p.hueShift + time * 25) % 360; 

        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${currentHue}, 75%, 65%, ${opacity})`;
        ctx.fill();
      });

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }} 
    />
  );
}