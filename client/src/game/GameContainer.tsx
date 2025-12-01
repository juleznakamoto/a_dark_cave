import MerchantDialog from "./MerchantDialog";
import CubeDialog from "./CubeDialog";
import InactivityDialog from "./InactivityDialog";
import { useState, useEffect, useMemo, useRef } from "react";
import { LimelightNav, NavItem } from "@/components/ui/limelight-nav";
import { Mountain, Trees, Castle, Landmark } from "lucide-react";
import '@/hooks/use-toast';

// Initialize version check
  useEffect(() => {
    logger.log('[VERSION] Initializing version check from GameContainer');
    logger.log('[VERSION] ⚠️ DIALOG DEACTIVATED - Logging only mode');

    startVersionCheck(() => {
      logger.log('[VERSION] 🔔 Version check callback fired!');
      logger.log('[VERSION] ⚠️ Dialog opening is DISABLED for debugging');
      logger.log('[VERSION] A new version was detected but dialog will not open');

      // Trigger toast with version check dialog content
      try {
        const { triggerToast } = useToast.getState(); // Assuming useToast provides a triggerToast function
        if (typeof triggerToast === 'function') {
          triggerToast("A new version of the game is available. Please refresh to update.");
          logger.log('[VERSION] ✅ Toast triggered');
        }
      } catch (error) {
        logger.log('[VERSION] ❌ Error triggering toast:', error);
      }
    });

    return () => {
      logger.log('[VERSION] Cleaning up version check');
      stopVersionCheck();
    };
  }, []);