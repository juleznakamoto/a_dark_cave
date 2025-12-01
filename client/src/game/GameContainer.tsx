// Initialize version check
  useEffect(() => {
    logger.log('[VERSION] Initializing version check from GameContainer');
    logger.log('[VERSION] setVersionCheckDialogOpen function:', setVersionCheckDialogOpen);

    startVersionCheck(() => {
      logger.log('[VERSION] Version check callback fired! Setting dialog open...');
      logger.log('[VERSION] Current versionCheckDialogOpen state:', versionCheckDialogOpen);
      setVersionCheckDialogOpen(true);
      logger.log('[VERSION] setVersionCheckDialogOpen(true) called');
    });

    return () => {
      logger.log('[VERSION] Cleaning up version check');
      stopVersionCheck();
    };
  }, [setVersionCheckDialogOpen]);