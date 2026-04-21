'use client';

import { Zap } from 'lucide-react';

interface CreditBadgeProps {
  credits?: number;
  packs?: number;
}

export function CreditBadge({ credits = 840, packs = 8 }: CreditBadgeProps) {
  return (
    <div
      className="credit-badge cursor-pointer hover:scale-105 transition-transform duration-200"
      title={`≈ ${packs} полных паков контента`}
    >
      <Zap className="w-3 h-3 fill-current" />
      <span>{credits.toLocaleString()} кр.</span>
    </div>
  );
}
