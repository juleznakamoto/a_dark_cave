// Initialize version check
  useEffect(() => {
    logger.log('[VERSION] Initializing version check from GameContainer');
    logger.log('[VERSION] ⚠️ DIALOG DEACTIVATED - Logging only mode');

    startVersionCheck(() => {
      logger.log('[VERSION] 🔔 Version check callback fired!');
      logger.log('[VERSION] ⚠️ Dialog opening is DISABLED for debugging');
      logger.log('[VERSION] A new version was detected but dialog will not open');

      // DIALOG DISABLED FOR DEBUGGING
      // Uncomment the code below to re-enable the dialog:
      /*
      try {
        const { setVersionCheckDialogOpen } = useGameStore.getState();
        if (typeof setVersionCheckDialogOpen === 'function') {
          setVersionCheckDialogOpen(true);
          logger.log('[VERSION] ✅ Dialog opened');
        }
      } catch (error) {
        logger.log('[VERSION] ❌ Error:', error);
      }
      */
    });

    return () => {
      logger.log('[VERSION] Cleaning up version check');
      stopVersionCheck();
    };
  }, []);