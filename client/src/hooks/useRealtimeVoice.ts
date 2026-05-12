import { useState, useEffect, useRef } from 'react';

interface UseRealtimeVoiceProps {
  onSpeechStart?: () => void;
  onSpeechEnd?: (base64Audio: string) => void;
}

export const useRealtimeVoice = ({ onSpeechStart, onSpeechEnd }: UseRealtimeVoiceProps) => {
  const [isActive, setIsActive] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const vADThreshold = 0.005; // Lowered threshold for hyper-sensitivity
  const silenceTimeout = 1200; // Faster response
  const lastSpeakTime = useRef<number>(Date.now());
  const isSpeakingRef = useRef(false);

  const startLiveMode = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      console.log("Audio Engine Active:", audioContextRef.current.state);

      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // ADDED: SIGNAL BOOST (5x Gain)
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 5.0; 
      
      const node = audioContextRef.current.createAnalyser();
      node.fftSize = 256;
      
      source.connect(gainNode);
      gainNode.connect(node);
      
      setAnalyser(node);
      
      // UNIVERSAL COMPATIBILITY: Detect supported mimeType
      const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
      const supportedType = types.find(type => MediaRecorder.isTypeSupported(type)) || '';
      
      const mediaRecorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : {});
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: supportedType || 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          if (base64data) onSpeechEnd?.(base64data);
          audioChunksRef.current = [];
        };
      };

      setIsActive(true);
      requestAnimationFrame(monitorVolume);
    } catch (err) {
      console.error("Failed to start Live Mode:", err);
    }
  };

  const monitorVolume = () => {
    if (!analyser || !isActive) return;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const currentVolume = sum / dataArray.length / 255;
    setVolume(currentVolume);

    const now = Date.now();
    if (currentVolume > vADThreshold) {
      lastSpeakTime.current = now;
      if (!isSpeakingRef.current) {
        isSpeakingRef.current = true;
        setIsUserSpeaking(true);
        onSpeechStart?.();
        if (mediaRecorderRef.current?.state === 'inactive') {
            audioChunksRef.current = [];
            mediaRecorderRef.current.start();
        }
      }
    } else {
      if (isSpeakingRef.current && now - lastSpeakTime.current > silenceTimeout) {
        isSpeakingRef.current = false;
        setIsUserSpeaking(false);
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
      }
    }

    if (isActive) requestAnimationFrame(monitorVolume);
  };

  const stopLiveMode = () => {
    setIsActive(false);
    setIsUserSpeaking(false);
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (mediaRecorderRef.current?.state !== 'inactive') try { mediaRecorderRef.current?.stop(); } catch(e) {}
    if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
  };

  return { isActive, isUserSpeaking, volume, analyser, startLiveMode, stopLiveMode };
};
