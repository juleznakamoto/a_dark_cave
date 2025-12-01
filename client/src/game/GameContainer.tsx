// Initialize version check
  useEffect(() => {
    logger.log('[VERSION] Initializing version check from GameContainer');

    startVersionCheck(() => {
      logger.log('[VERSION] Version check callback fired! Getting store reference...');
      try {
        // Get the latest store reference directly instead of using closure
        const { setVersionCheckDialogOpen } = useGameStore.getState();

        if (typeof setVersionCheckDialogOpen === 'function') {
          logger.log('[VERSION] Calling setVersionCheckDialogOpen(true)...');
          setVersionCheckDialogOpen(true);
          logger.log('[VERSION] ✅ setVersionCheckDialogOpen(true) called successfully');
        } else {
          logger.log('[VERSION] ❌ setVersionCheckDialogOpen is not a function:', typeof setVersionCheckDialogOpen);
        }
      } catch (error) {
        logger.log('[VERSION] ❌ Error in version check callback:', error);
      }
    });

    return () => {
      logger.log('[VERSION] Cleaning up version check');
      stopVersionCheck();
    };
  }, []);