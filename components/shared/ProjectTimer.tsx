'use client';

import { useState, useEffect } from 'react';
import { useRoomStore } from '@/lib/store';

export default function ProjectTimer() {
  const room = useRoomStore((state) => state.room);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!room) return;
    
    // Only care about valid projects
    if (room.currentProjectIndex < 0 || room.currentProjectIndex >= room.projects.length) {
      setStartTime(null);
      return;
    }

    const storageKey = `timer-${room.code}-proj-${room.currentProjectIndex}`;
    
    // Check if we already have a start time for this project
    const existingStart = sessionStorage.getItem(storageKey);
    
    if (existingStart) {
      setStartTime(parseInt(existingStart, 10));
    } else if (room.currentStage !== 'guess') {
      // Stage moved past guess, start the timer
      const newStart = Date.now();
      sessionStorage.setItem(storageKey, newStart.toString());
      setStartTime(newStart);
    } else {
      // It is 'guess' stage, timer hasn't started yet
      setStartTime(null);
    }
  }, [room?.currentStage, room?.currentProjectIndex, room?.code]);

  useEffect(() => {
    if (!startTime) return;
    
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime]);

  if (!room || room.currentProjectIndex < 0 || room.currentProjectIndex >= room.projects.length) {
    return null;
  }

  if (!startTime) return null;

  const elapsedSeconds = Math.floor((now - startTime) / 1000);
  let remainingSeconds = (10 * 60) - elapsedSeconds;
  
  // Clamp at -5 minutes (-300 seconds)
  if (remainingSeconds < -300) {
    remainingSeconds = -300;
  }

  const isNegative = remainingSeconds < 0;
  const absSeconds = Math.abs(remainingSeconds);
  
  const mins = Math.floor(absSeconds / 60);
  const secs = absSeconds % 60;
  
  const formattedTime = `${isNegative ? '-' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  
  return (
    <div className="fixed bottom-10 left-2 text-[12px] font-black bg-white border-2 border-black text-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-50">
      ⏱️ {formattedTime}
    </div>
  );
}
