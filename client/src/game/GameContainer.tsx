import MerchantDialog from "./MerchantDialog";
import CubeDialog from "./CubeDialog";
import InactivityDialog from "./InactivityDialog";
import { useState, useEffect, useMemo, useRef } from "react";
import { LimelightNav, NavItem } from "@/components/ui/limelight-nav";
import { Mountain, Trees, Castle, Landmark } from "lucide-react";
import { toast } from '@/hooks/use-toast';

// Initialize version check
  useEffect(() => {
    logger.log('[VERSION] Initializing version check from GameContainer');

    startVersionCheck(() => {
      logger.log('[VERSION] 🔔 Version check callback fired!');
      logger.log('[VERSION] Triggering toast notification for new version');

      // Trigger toast with version check dialog content
      try {
        logger.log('[VERSION] Calling toast function...');
        toast({
          title: "New Version Available",
          description: "A new version of the game is available. Please refresh to update.",
          action: {
            label: "Refresh",
            onClick: () => {
              logger.log('[VERSION] User clicked refresh button');
              window.location.reload();
            }
          }
        });
        logger.log('[VERSION] ✅ Toast triggered successfully');
      } catch (error) {
        logger.log('[VERSION] ❌ Error triggering toast:', error);
      }
    });

    return () => {
      logger.log('[VERSION] Cleaning up version check');
      stopVersionCheck();
    };
  }, []);