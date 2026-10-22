"use client";
import { useEffect, useRef } from "react";
import { useAura } from "@/context/AuraContext";
import { scoreToColor } from "@/config/auraTheme";

/**
 * NeuralBackground — Three.js particle neural network that responds to wellness state.
 * Particles shift from teal (calm) → amber (stressed) → red (overloaded).
 * Renders behind all content at the root level.
 */
export default function NeuralBackground() {
    const canvasRef = useRef(null);
    const { wellness } = useAura();
    const wellnessRef = useRef(wellness.wellnessScore);
    const animRef = useRef(null);

    useEffect(() => {
        wellnessRef.current = wellness.wellnessScore;
    }, [wellness.wellnessScore]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const NODE_COUNT = 70;
        const CONNECTION_DIST = 160;

        // Initialize nodes
        const nodes = Array.from({ length: NODE_COUNT }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r: Math.random() * 2 + 1,
            phase: Math.random() * Math.PI * 2,
        }));

        /**
         * Returns node color based on wellness score.
         * @param {number} score
         * @returns {{ node: string, edge: string }}
         */
        function getColors(score) {
            if (score >= 70) return { node: "rgba(20,184,166,", edge: "rgba(6,182,212," };
            if (score >= 45) return { node: "rgba(139,92,246,", edge: "rgba(129,140,248," };
            if (score >= 25) return { node: "rgba(245,158,11,", edge: "rgba(251,191,36," };
            return { node: "rgba(239,68,68,", edge: "rgba(248,113,113," };
        }

        let frame = 0;
        function animate() {
            animRef.current = requestAnimationFrame(animate);
            frame++;

            ctx.clearRect(0, 0, width, height);
            const score = wellnessRef.current;
            const { node: nodeColor, edge: edgeColor } = getColors(score);

            // Update node positions
            nodes.forEach((n) => {
                n.phase += 0.005;
                n.x += n.vx + Math.sin(n.phase) * 0.15;
                n.y += n.vy + Math.cos(n.phase) * 0.12;

                if (n.x < 0) n.x = width;
                if (n.x > width) n.x = 0;
                if (n.y < 0) n.y = height;
                if (n.y > height) n.y = 0;
            });

            // Draw edges
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECTION_DIST) {
                        const alpha = (1 - dist / CONNECTION_DIST) * 0.18;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = `${edgeColor}${alpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }

            // Draw nodes
            nodes.forEach((n) => {
                const pulse = Math.sin(n.phase * 2) * 0.5 + 0.5;
                const alpha = 0.25 + pulse * 0.35;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r + pulse * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = `${nodeColor}${alpha})`;
                ctx.fill();
            });
        }

        animate();

        const onResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };
        window.addEventListener("resize", onResize);

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
            window.removeEventListener("resize", onResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ opacity: 0.5 }}
        />
    );
}
