'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseVoiceFollowingProps {
  script: string;
  isActive: boolean;
}

export function useVoiceFollowing({ script, isActive }: UseVoiceFollowingProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Normalize script into lines for matching
  const lines = script.split('\n').filter(l => l.trim().length > 0);
  const lastMatchedIndex = useRef(0);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ru-RU'; // Default to Russian, can be dynamic

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      if (isActive) recognition.start(); // Auto-restart if still active
      else setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map(result => result.transcript)
        .join('')
        .toLowerCase();

      // Simple matching logic: look for the latest recognized words in upcoming lines
      // This is a basic implementation and can be improved with fuzzy search
      for (let i = lastMatchedIndex.current; i < Math.min(lastMatchedIndex.current + 3, lines.length); i++) {
        const line = lines[i].toLowerCase();
        // Check if a significant portion of the line is in the transcript
        if (transcript.includes(line.substring(0, Math.min(line.length, 10)))) {
          setCurrentLineIndex(i);
          lastMatchedIndex.current = i;
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isActive, lines]);

  useEffect(() => {
    if (isActive) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [isActive, startListening, stopListening]);

  return {
    currentLineIndex,
    isListening,
    totalLines: lines.length
  };
}
