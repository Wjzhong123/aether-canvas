import { useState, useEffect, useRef } from 'react';

interface VoiceConfig {
  threshold?: number;
  silenceDelay?: number;
  onSpeechStart?: () => void;
  onSpeechEnd?: (blob: Blob) => void;
  onVolumeChange?: (volume: number) => void;
}

export const useRealtimeVoice = (config: VoiceConfig) => {
  const [isActive, setIsActive] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  
  const threshold = config.threshold || 0.04;
  const silenceDelay = config.silenceDelay || 1200;
  const lastSpeakTime = useRef<number>(0);
  const isSpeakingRef = useRef(false);

  const startLiveMode = async () => {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new AudioContext();
      if (audioContext.current.state === 'suspended') {
        await audioContext.current.resume();
      }
      
      const source = audioContext.current.createMediaStreamSource(stream.current);
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 256;
      source.connect(analyser.current);

      mediaRecorder.current = new MediaRecorder(stream.current);
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        config.onSpeechEnd?.(blob);
        chunks.current = [];
      };

      setIsActive(true);
      requestAnimationFrame(updateVolume);
    } catch (err) {
      console.error("Live Mode Error:", err);
    }
  };

  const stopLiveMode = () => {
    setIsActive(false);
    setIsUserSpeaking(false);
    stream.current?.getTracks().forEach(t => t.stop());
    audioContext.current?.close();
    mediaRecorder.current?.stop();
  };

  const updateVolume = () => {
    if (!isActive || !analyser.current) return;
    
    const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
    analyser.current.getByteFrequencyData(dataArray);
    
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const vol = sum / dataArray.length / 255;
    setVolume(vol);
    config.onVolumeChange?.(vol);

    const now = Date.now();
    if (vol > threshold) {
      if (!isSpeakingRef.current) {
        isSpeakingRef.current = true;
        setIsUserSpeaking(true);
        
        // INTERRUPTION: Stop any current AI speech
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        
        config.onSpeechStart?.();
        if (mediaRecorder.current?.state === 'inactive') mediaRecorder.current?.start();
      }
      lastSpeakTime.current = now;
    } else if (isSpeakingRef.current && now - lastSpeakTime.current > silenceDelay) {
      isSpeakingRef.current = false;
      setIsUserSpeaking(false);
      if (mediaRecorder.current?.state === 'recording') mediaRecorder.current?.stop();
    }

    if (isActive) requestAnimationFrame(updateVolume);
  };

  return {
    isActive,
    isUserSpeaking,
    volume,
    analyser: analyser.current,
    startLiveMode,
    stopLiveMode
  };
};
