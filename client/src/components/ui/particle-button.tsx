"use client";

import * as React from "react";
import { useState, useRef, useEffect, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/button";

interface ParticleButtonProps extends ButtonProps {
    spawnInterval?: number;
    hoverDelay?: number;
}

interface Spark {
    id: number;
    angle: number;
    distance: number;
    color: string;
    lifetime: number;
    offsetX: number;
    createdAt: number;
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
                            scale: Math.random() * 0.6 + 0.2,
                        }}
                        animate={{
                            opacity: 0,
                            scale: 0.15 + Math.random() * 0.2,
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

const ParticleButton = forwardRef<HTMLButtonElement, ParticleButtonProps>(({
    children,
    onClick,
    spawnInterval = 300,
    hoverDelay = 100,
    className,
    ...props
}: ParticleButtonProps, ref) => {
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
            angle: (Math.random() * 120 - 150) * (Math.PI / 180),
            distance: Math.random() * 180 + 40,
            color: colors[Math.floor(Math.random() * colors.length)],
            lifetime: 0.8 + Math.random() * 1.2,
            offsetX: buttonWidth * 0.5 + (Math.random() * 74 - 37),
            createdAt: Date.now(),
        }));

        setSparks((prev) => [...prev, ...newSparks]);
    };

    useEffect(() => {
        if (sparks.length > 500) {
            setSparks((prev) => prev.slice(-300)); // prevent memory bloat
        }
    }, [sparks]);

    // Clean up particles after 3 seconds
    useEffect(() => {
        const cleanup = setInterval(() => {
            const now = Date.now();
            setSparks((prev) =>
                prev.filter((spark) => {
                    // Remove sparks older than 3 seconds
                    const sparkAge = now - spark.createdAt;
                    return sparkAge < 3000;
                }),
            );
        }, 1000); // Check every second

        return () => clearInterval(cleanup);
    }, []);

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

            // gradually increase sparks over 10 seconds
            rampUpRef.current = setInterval(() => {
                if (rampStartRef.current) {
                    const elapsed = Date.now() - rampStartRef.current;
                    if (elapsed < 10000) {
                        spawnCountRef.current =
                            1 + Math.floor((elapsed / 10000) * 10);
                    } else {
                        spawnCountRef.current =
                            Math.floor(Math.random() * 7) + 6; // max
                        clearInterval(rampUpRef.current!);
                        rampUpRef.current = null;
                    }
                }
            }, Math.random() * 101 + 100);

            // gradually increase glow intensity over 0.5 seconds
            glowRampRef.current = setInterval(() => {
                if (rampStartRef.current) {
                    const elapsed = Date.now() - rampStartRef.current;
                    if (elapsed < 500) {
                        const progress = elapsed / 500;
                        setGlowIntensity(0.1 + progress * 0.9); // from 0.1 to 1.0
                    } else {
                        setGlowIntensity(1.0); // max intensity
                        clearInterval(glowRampRef.current!);
                        glowRampRef.current = null;
                        glowRampRef.current = setInterval(
                            () => {
                                setGlowIntensity(1.0);
                            },
                            Math.random() * 50 + 150,
                        );
                    }
                }
            }, Math.random() * 51 + 50);

            // add flickering effect that continues throughout
            flickerRef.current = setInterval(() => {
                const flicker = 0.45 + Math.random() * 0.55;
                setGlowIntensity((prev) => Math.min(2, prev * flicker));
            }, Math.random() * 150 + 50);
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
                ref={(node) => {
                    buttonRef.current = node;
                    if (typeof ref === 'function') {
                        ref(node);
                    } else if (ref) {
                        ref.current = node;
                    }
                }}
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
});

ParticleButton.displayName = 'ParticleButton';

export { ParticleButton };