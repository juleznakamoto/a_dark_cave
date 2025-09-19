
"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/button";

interface ParticleButtonProps extends ButtonProps {
    onSuccess?: () => void;
    successDuration?: number;
    hoverDelay?: number;
}

function SuccessParticles({
    buttonRef,
}: {
    buttonRef: React.RefObject<HTMLButtonElement>;
}) {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) {
        console.log("No button rect found");
        return null;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    console.log("Button position:", { centerX, centerY, rect });

    return (
        <AnimatePresence>
            {[...Array(12)].map((_, i) => {
                const angle = (i * 30) * Math.PI / 180;
                const distance = Math.random() * 60 + 30;
                const endX = Math.cos(angle) * distance;
                const endY = Math.sin(angle) * distance;
                
                return (
                    <motion.div
                        key={i}
                        className="fixed w-2 h-2 bg-orange-500 rounded-full shadow-lg"
                        style={{ 
                            left: centerX - 1, 
                            top: centerY - 1, 
                            zIndex: 9999,
                            pointerEvents: 'none'
                        }}
                        initial={{
                            scale: 0,
                            x: 0,
                            y: 0,
                        }}
                        animate={{
                            scale: [0, 1.5, 0],
                            x: [0, endX],
                            y: [0, endY],
                        }}
                        transition={{
                            duration: 1.2,
                            delay: i * 0.05,
                            ease: "easeOut",
                        }}
                    />
                );
            })}
        </AnimatePresence>
    );
}

function ParticleButton({
    children,
    onClick,
    onSuccess,
    successDuration = 1000,
    hoverDelay = 3000,
    className,
    ...props
}: ParticleButtonProps) {
    const [showParticles, setShowParticles] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        console.log("Mouse entered, starting hover timer");
        setIsHovered(true);
        hoverTimeoutRef.current = setTimeout(() => {
            console.log("Hover delay completed, showing particles");
            setShowParticles(true);
            setTimeout(() => {
                console.log("Hiding particles");
                setShowParticles(false);
            }, successDuration);
        }, hoverDelay);
    };

    const handleMouseLeave = () => {
        console.log("Mouse left, clearing timer");
        setIsHovered(false);
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
    };

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        if (onClick) {
            onClick(e);
        }
    };

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    return (
        <>
            {showParticles && <SuccessParticles buttonRef={buttonRef} />}
            <Button
                ref={buttonRef}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={cn(
                    "relative",
                    showParticles && "scale-95",
                    "transition-transform duration-100",
                    className
                )}
                {...props}
            >
                {children}
            </Button>
        </>
    );
}

export { ParticleButton }
