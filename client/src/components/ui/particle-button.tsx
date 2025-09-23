"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/button";

interface ParticleButtonProps extends ButtonProps {
    spawnInterval?: number; // how often sparks spawn
    hoverDelay?: number; // delay before sparks start spawning on hover
}

interface Spark {
    id: number;
    angle: number;
    distance: number;
    color: string;
    lifetime: number;
    offsetX: number;
}

function SuccessParticles({
    buttonRef,
    sparks,
}: {
    buttonRef: React.RefObject<HTMLButtonElement>;
    sparks: Spark[];
}) {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return (
        <>
            {sparks.map((spark) => {
                const startX = rect.left + spark.offsetX;
                const startY = rect.top + 15;

                const endX = startX + Math.cos(spark.angle) * spark.distance;
                const endY =
                    startY - Math.abs(Math.sin(spark.angle) * spark.distance); // always upwards

                return (
                    <motion.div
                        key={spark.id}
                        className="fixed rounded-full shadow-md"
                        style={{
                            width: "4px",
                            height: "4px",
                            backgroundColor: spark.color,
                            left: startX,
                            top: startY,
                            zIndex: 9999,
                            pointerEvents: "none",
                            boxShadow: `0 0 ${Math.random() * 8 + 3}px ${spark.color}`,
                        }}
                        initial={{
                            opacity: 1,
                            scale: Math.random() * 0.5 + 0.5,
                        }}
                        animate={{
                            opacity: 0,
                            scale: 0.2 + Math.random() * 0.2,
                            x:
                                endX -
                                startX +
                                Math.sin(Math.random() * Math.PI * 2) * 10,
                            y: endY - startY,
                        }}
                        transition={{
                            duration: spark.lifetime,
                            ease: "easeOut",
                        }}
                    />
                );
            })}
        </>
    );
}

function ParticleButton({
    children,
    onClick,
    spawnInterval = 300,
    hoverDelay = 1500,
    className,
    ...props
}: ParticleButtonProps) {
    const [sparks, setSparks] = useState<Spark[]>([]);
    const [isGlowing, setIsGlowing] = useState(false);
    const [glowIntensity, setGlowIntensity] = useState(0);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const rampUpRef = useRef<NodeJS.Timeout | null>(null);
    const glowRampRef = useRef<NodeJS.Timeout | null>(null);
    const flickerRef = useRef<NodeJS.Timeout | null>(null);
    const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const idRef = useRef(0);
    const spawnCountRef = useRef(2); // initial number of sparks per spawn
    const rampStartRef = useRef<number | null>(null);

    const colors = ["#ffb347", "#ff9234", "#ffcd94", "#ff6f3c", "#ff4500"]; // ember-like

    const spawnSparks = () => {
        if (!buttonRef.current) return;
        const buttonWidth = buttonRef.current.offsetWidth;

        const count = spawnCountRef.current; // dynamic number of sparks
        const newSparks: Spark[] = Array.from({ length: count }).map(() => ({
            id: idRef.current++,
            angle: (Math.random() * 90 - 135) * (Math.PI / 180),
            distance: Math.random() * 150 + 40,
            color: colors[Math.floor(Math.random() * colors.length)],
            lifetime: 0.6 + Math.random() * 1.2,
            offsetX: buttonWidth * 0.5 + (Math.random() * 70 - 35),
        }));

        setSparks((prev) => [...prev, ...newSparks]);
    };

    useEffect(() => {
        if (sparks.length > 500) {
            setSparks((prev) => prev.slice(-300)); // prevent memory bloat
        }
    }, [sparks]);

    const clearAllTimers = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (rampUpRef.current) {
            clearInterval(rampUpRef.current);
            rampUpRef.current = null;
        }
        if (glowRampRef.current) {
            clearInterval(glowRampRef.current);
            glowRampRef.current = null;
        }
        if (flickerRef.current) {
            clearInterval(flickerRef.current);
            flickerRef.current = null;
        }
        if (delayTimeoutRef.current) {
            clearTimeout(delayTimeoutRef.current);
            delayTimeoutRef.current = null;
        }
    };

    const handleMouseEnter = () => {
        // start delayed spawn
        delayTimeoutRef.current = setTimeout(() => {
            setIsGlowing(true);
            setGlowIntensity(0.1); // start with very small glow
            spawnCountRef.current = 2;
            rampStartRef.current = Date.now();

            spawnSparks(); // spawn immediately
            intervalRef.current = setInterval(spawnSparks, spawnInterval);

            // gradually increase sparks over 8 seconds
            rampUpRef.current = setInterval(() => {
                if (rampStartRef.current) {
                    const elapsed = Date.now() - rampStartRef.current;
                    if (elapsed < 8000) {
                        spawnCountRef.current =
                            1 + Math.floor((elapsed / 8000) * 10);
                    } else {
                        spawnCountRef.current = 10; // max
                        clearInterval(rampUpRef.current!);
                        rampUpRef.current = null;
                    }
                }
            }, 200);

            // gradually increase glow intensity over 6 seconds
            glowRampRef.current = setInterval(() => {
                if (rampStartRef.current) {
                    const elapsed = Date.now() - rampStartRef.current;
                    if (elapsed < 6000) {
                        const progress = elapsed / 6000;
                        setGlowIntensity(0.1 + (progress * 0.9)); // from 0.1 to 1.0
                    } else {
                        setGlowIntensity(1.0); // max intensity
                        clearInterval(glowRampRef.current!);
                        glowRampRef.current = null;
                        
                        // Reset glow to max every 2 seconds to maintain intensity
                        glowRampRef.current = setInterval(() => {
                            setGlowIntensity(1.0);
                        }, 2000);
                    }
                }
            }, 100);

            // add flickering effect that continues throughout
            flickerRef.current = setInterval(() => {
                const flicker = 0.65 + Math.random() * 0.3;
                setGlowIntensity(prev => Math.min(1.3, prev * flicker));
            }, 150);
        }, hoverDelay);
    };

    const handleMouseLeave = () => {
        clearAllTimers();
        setIsGlowing(false);
        setGlowIntensity(0);
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (onClick) onClick(e);
    };

    useEffect(() => {
        return () => {
            clearAllTimers();
        };
    }, []);

    return (
        <>
            <SuccessParticles buttonRef={buttonRef} sparks={sparks} />
            <Button
                ref={buttonRef}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={cn(
                    "relative transition-all duration-300",
                    isGlowing && "text-shadow-glow",
                    className,
                )}
                style={{
                    textShadow: isGlowing 
                        ? `0 0 ${10 * glowIntensity}px #ff6347, 0 0 ${20 * glowIntensity}px #ff4500, 0 0 ${30 * glowIntensity}px #ff8c00, 0 0 ${40 * glowIntensity}px #ffa500`
                        : "none",
                }}
                {...props}
            >
                {children}
            </Button>
        </>
    );
}

export { ParticleButton };
