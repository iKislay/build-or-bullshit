'use client';

import { useEffect, useState } from 'react';
import { Stage } from '@/lib/types';

interface StageTransitionProps {
  stage: Stage;
}

export default function StageTransition({ stage }: StageTransitionProps) {
  // Disabled as per user request to never show the giant center-screen text overlay
  return null;
}
