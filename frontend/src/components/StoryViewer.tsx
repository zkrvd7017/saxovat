import React, { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { StoryAPI } from "@/lib/api";

interface StoryViewerProps {
  stories: StoryAPI[];
  initialIndex: number;
  onClose: () => void;
}

export function StoryViewer({ stories, initialIndex, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<number | null>(null);

  const DURATION = 5000; // 5 seconds per story
  const TICK = 50; // update progress every 50ms

  useEffect(() => {
    // Reset progress when index changes
    setProgress(0);

    // Start progress timer
    if (progressInterval.current) {
      window.clearInterval(progressInterval.current);
    }

    progressInterval.current = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + (TICK / DURATION) * 100;
        if (next >= 100) {
          // Time is up, move to next
          handleNext();
          return 100;
        }
        return next;
      });
    }, TICK);

    return () => {
      if (progressInterval.current) {
        window.clearInterval(progressInterval.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose(); // Close if it was the last story
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (!stories.length) return null;

  const currentStory = stories[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm sm:p-4">
      <div className="relative flex h-full w-full max-w-md flex-col bg-black sm:h-[85vh] sm:rounded-3xl sm:overflow-hidden">

        {/* Top Progress Bars */}
        <div className="absolute top-0 inset-x-0 z-20 flex gap-1 p-4">
          {stories.map((_, idx) => (
            <div key={idx} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30 backdrop-blur-md">
              <div
                className="h-full bg-white transition-all duration-[50ms] ease-linear"
                style={{
                  width:
                    idx < currentIndex
                      ? "100%"
                      : idx === currentIndex
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Close Button & Header Info */}
        <div className="absolute top-6 inset-x-0 z-20 flex items-center justify-between px-4 text-white">
          <div className="flex items-center gap-3 drop-shadow-md">
            <div className="h-8 w-8 rounded-full border border-white/50 bg-white/20 p-[2px] overflow-hidden">
               <img src={currentStory.image_url} alt="" decoding="async" width={32} height={32} className="w-full h-full object-cover rounded-full" />
            </div>
            <span className="font-semibold text-sm drop-shadow-md">{currentStory.title}</span>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image */}
        <div className="relative h-full w-full flex-1">
          <img
            src={currentStory.image_url}
            alt={currentStory.title}
            decoding="async"
            fetchPriority="high"
            className="h-full w-full object-cover select-none"
            draggable={false}
          />
          {/* Navigation Overlay (Left 30% goes back, right 70% goes next) */}
          <div className="absolute inset-0 flex">
            <div className="h-full w-[30%]" onClick={handlePrev} />
            <div className="h-full w-[70%]" onClick={handleNext} />
          </div>
        </div>

        {/* Desktop Navigation Chevrons (only visible on wider screens) */}
        <div className="hidden sm:flex absolute inset-y-0 inset-x-[-3rem] items-center justify-between pointer-events-none">
          {currentIndex > 0 && (
            <button onClick={handlePrev} className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30">
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {currentIndex < stories.length - 1 && (
            <button onClick={handleNext} className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30 ml-auto">
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
