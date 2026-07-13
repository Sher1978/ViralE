'use client';

import { Zap } from 'lucide-react';

interface CreditBadgeProps {
  credits?: number;
  packs?: number;
  onClick?: () => void;
}

export function CreditBadge({ credits = 840, packs = 8, onClick }: CreditBadgeProps) {
  return (
    <div
      onClick={onClick}
      className="credit-badge cursor-pointer hover:scale-105 transition-transform duration-200"
      title={`≈ ${packs} полных паков контента`}
    >
      <Zap className="w-3 h-3 fill-current" />
      <span>{credits.toLocaleString()} кр.</span>
    </div>
  );
}
