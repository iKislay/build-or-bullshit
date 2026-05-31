'use client';

import { useEffect, useState } from 'react';
import { Stage } from '@/lib/types';

interface StageTransitionProps {
  stage: Stage;
}

export default function StageTransition({ stage }: StageTransitionProps) {
  const [visible, setVisible] = useState(false);
  const [currentStage, setCurrentStage] = useState(stage);

  useEffect(() => {
    if (stage !== currentStage) {
      setCurrentStage(stage);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [stage, currentStage]);

  if (!visible) return null;

  const stageDisplay = stage.toUpperCase().replace('-', ' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-black text-white border-8 border-[#FFEB3B] p-12 shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] animate-bounce">
        <h1 className="text-8xl font-black italic">
          {stageDisplay}
        </h1>
      </div>
    </div>
  );
}
