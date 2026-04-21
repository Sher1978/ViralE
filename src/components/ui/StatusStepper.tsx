'use client';

import { useTranslations } from 'next-intl';

interface Step {
  id: string;
}

const STEPS: Step[] = [
  { id: 'idea' },
  { id: 'script' },
  { id: 'storyboard' },
  { id: 'render' },
  { id: 'done' },
];

interface StatusStepperProps {
  currentStep: string;
}

export function StatusStepper({ currentStep }: StatusStepperProps) {
  const t = useTranslations('stepper');
  const currentIdx = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="progress-bar mb-3">
        <div
          className="progress-fill transition-all duration-700"
          style={{ width: `${Math.max(5, (currentIdx / (STEPS.length - 1)) * 100)}%` }}
        />
      </div>

      {/* Step labels */}
      <div className="flex justify-between items-center">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isActive = idx === currentIdx;

          return (
            <div key={step.id} className="flex flex-col items-center gap-1">
              <div
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  background: isDone
                    ? 'rgba(0,255,204,0.5)'
                    : isActive
                      ? '#00FFCC'
                      : 'rgba(255,255,255,0.12)',
                  boxShadow: isActive ? '0 0 10px rgba(0,255,204,0.6)' : undefined,
                  width: isActive ? '20px' : '8px',
                  borderRadius: isActive ? '4px' : '50%',
                }}
              />
              <span
                className="text-[8px] font-semibold uppercase tracking-widest transition-all duration-300"
                style={{
                  color: isActive ? '#00FFCC' : isDone ? 'rgba(0,255,204,0.4)' : 'rgba(255,255,255,0.2)',
                }}
              >
                {t(step.id)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
