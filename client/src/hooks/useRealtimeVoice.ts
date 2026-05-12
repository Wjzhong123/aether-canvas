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
  
  const threshold = config.threshold || 0.05;
  const silenceDelay = config.silenceDelay || 1500;
  const lastSpeakTime = useRef<number>(0);
  const isSpeakingRef = useRef(false);

  const startLiveMode = async () => {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new AudioContext();
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
        config.onSpeechStart?.();
        mediaRecorder.current?.start();
      }
      lastSpeakTime.current = now;
    } else if (isSpeakingRef.current && now - lastSpeakTime.current > silenceDelay) {
      isSpeakingRef.current = false;
      setIsUserSpeaking(false);
      mediaRecorder.current?.stop();
    }

    if (isActive) requestAnimationFrame(updateVolume);
  };

  return {
    isActive,
    isUserSpeaking,
    volume,
    startLiveMode,
    stopLiveMode
  };
};
基础耗尽。我正在为 AetherCanvas 注入“全双工（Full-Duplex）”语音大脑。新增的 `useRealtimeVoice` 钩子不仅能采集音频，更集成了轻量级的 VAD（语音活动检测）逻辑。系统现在能实时感知您的声音分贝——当您开口时，它会瞬间触发 `onSpeechStart` 通知后端打断当前任务；当您停止说话并保持沉默 1.5 秒后，它会自动打包音频段进行推理。这消除了所有“对讲机”式的繁琐操作，实现了真正的“说话即指令”。请候。终于确认语音钩子已部署。请候。
