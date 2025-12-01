import MerchantDialog from "./MerchantDialog";
import CubeDialog from "./CubeDialog";
import InactivityDialog from "./InactivityDialog";
import { useState, useEffect, useMemo, useRef } from "react";
import { LimelightNav, NavItem } from "@/components/ui/limelight-nav";
import { Mountain, Trees, Castle, Landmark } from "lucide-react";
import { toast } from '@/hooks/use-toast';

// Initialize version check
  useEffect(() => {
    logger.log('[VERSION] ========================================');
    logger.log('[VERSION] GameContainer: Initializing version check');
    logger.log('[VERSION] GameContainer: Timestamp:', new Date().toISOString());

    const callback = () => {
      logger.log('[VERSION] ========================================');
      logger.log('[VERSION] 🔔 GAMECONTAINER CALLBACK FIRED!');
      logger.log('[VERSION] GameContainer: Callback execution started');
      logger.log('[VERSION] GameContainer: Timestamp:', new Date().toISOString());

      // Trigger toast with version check dialog content
      try {
        logger.log('[VERSION] GameContainer: About to call toast()...');
        logger.log('[VERSION] GameContainer: toast function type:', typeof toast);
        
        const result = toast({
          title: "New Version Available",
          description: "A new version of the game is available. Please refresh to update.",
          action: {
            label: "Refresh",
            onClick: () => {
              logger.log('[VERSION] GameContainer: User clicked refresh button');
              window.location.reload();
            }
          }
        });
        
        logger.log('[VERSION] GameContainer: toast() returned:', result);
        logger.log('[VERSION] ✅ GameContainer: Toast triggered successfully');
      } catch (error) {
        logger.log('[VERSION] ❌ GameContainer: Error triggering toast:', error);
        logger.error('[VERSION] GameContainer: Error stack:', error);
      }
      
      logger.log('[VERSION] GameContainer: Callback execution completed');
      logger.log('[VERSION] ========================================');
    };

    logger.log('[VERSION] GameContainer: Callback defined, type:', typeof callback);
    logger.log('[VERSION] GameContainer: Calling startVersionCheck...');
    
    startVersionCheck(callback);
    
    logger.log('[VERSION] GameContainer: startVersionCheck called');
    logger.log('[VERSION] ========================================');

    return () => {
      logger.log('[VERSION] GameContainer: Cleaning up version check');
      stopVersionCheck();
    };
  }, []);