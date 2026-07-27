'use client';

import { useEffect } from 'react';
import { captureTrafficSource } from '@/lib/analytics/trafficTracker';

export function TrafficTrackerComponent() {
  useEffect(() => {
    captureTrafficSource();
  }, []);

  return null;
}
