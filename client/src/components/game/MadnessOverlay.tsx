
import React from 'react';
import { useMadnessEffects } from '@/hooks/useMadnessEffects';

export const MadnessOverlay: React.FC = () => {
  const { isEffectActive, currentEffect } = useMadnessEffects();

  if (!isEffectActive || currentEffect !== 'overlay') {
    return null;
  }

  return <div className="madness-overlay" />;
};

export default MadnessOverlay;
