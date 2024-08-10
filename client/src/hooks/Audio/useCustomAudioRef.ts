import { useEffect, useRef } from 'react';

interface CustomAudioElement extends HTMLAudioElement {
  customStarted?: boolean;
  customEnded?: boolean;
  customPaused?: boolean;
  customProps?: {
    customStarted?: boolean;
    customEnded?: boolean;
    customPaused?: boolean;
  };
}

type TCustomAudioResult = { audioRef: React.MutableRefObject<CustomAudioElement | null> };

export default function useCustomAudioRef({
  setIsPlaying,
}: {
  setIsPlaying: (isPlaying: boolean) => void;
}): TCustomAudioResult {
  const audioRef = useRef<CustomAudioElement | null>(null);
  useEffect(() => {
    let lastTimeUpdate: number | null = null;
    let sameTimeUpdateCount = 0;

    const handleEnded = () => {
      setIsPlaying(false);
      console.log('global audio ended');
      if (audioRef.current) {
        audioRef.current.customEnded = true;
        URL.revokeObjectURL(audioRef.current.src);
      }
    };

    const handleStart = () => {
      setIsPlaying(true);
      console.log('global audio started');
      if (audioRef.current) {
        audioRef.current.customStarted = true;
      }
    };

    const handlePause = () => {
      console.log('global audio paused');
      if (audioRef.current) {
        audioRef.current.customPaused = true;
      }
    };

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        const currentTime = audioRef.current.currentTime;
        // console.log('Current time: ', currentTime);

        if (currentTime === lastTimeUpdate) {
          sameTimeUpdateCount += 1;
        } else {
          sameTimeUpdateCount = 0;
        }

        lastTimeUpdate = currentTime;

        if (sameTimeUpdateCount >= 1) {
          console.log('Detected end of audio based on time update');
          audioRef.current.pause();
          handleEnded();
        }
      }
    };

    const audioElement = audioRef.current;

    if (audioRef.current) {
      audioRef.current.addEventListener('ended', handleEnded);
      audioRef.current.addEventListener('play', handleStart);
      audioRef.current.addEventListener('pause', handlePause);
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);

      audioRef.current.customProps = {
        customStarted: false,
        customEnded: false,
        customPaused: false,
      };
    }

    return () => {
      if (audioElement) {
        audioElement.removeEventListener('ended', handleEnded);
        audioElement.removeEventListener('play', handleStart);
        audioElement.removeEventListener('pause', handlePause);
        audioElement.removeEventListener('timeupdate', handleTimeUpdate);
        URL.revokeObjectURL(audioElement.src);
      }
    };
  }, [setIsPlaying]);

  return { audioRef };
}
