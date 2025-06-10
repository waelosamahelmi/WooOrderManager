let audioContext: AudioContext | null = null;
let audioEnabled = true;
let audioVolume = 0.8;

// Initialize audio context
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Create notification sound using oscillator
function createNotificationSound(frequency: number, duration: number) {
  const context = initAudioContext();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  
  oscillator.frequency.setValueAtTime(frequency, context.currentTime);
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(audioVolume * 0.5, context.currentTime + 0.1);
  gainNode.gain.linearRampToValueAtTime(0, context.currentTime + duration);
  
  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + duration);
}

export function playNotificationSound() {
  if (!audioEnabled) return;
  
  try {
    // Play a sequence of notification sounds
    createNotificationSound(800, 0.3);
    setTimeout(() => createNotificationSound(600, 0.3), 200);
    setTimeout(() => createNotificationSound(800, 0.3), 400);
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
}

export function setAudioEnabled(enabled: boolean) {
  audioEnabled = enabled;
}

export function setAudioVolume(volume: number) {
  audioVolume = Math.max(0, Math.min(1, volume / 100));
}

// Request audio permission on user interaction
export function requestAudioPermission() {
  if (audioContext?.state === 'suspended') {
    audioContext.resume();
  }
}

// Auto-request permission on first user interaction
document.addEventListener('click', requestAudioPermission, { once: true });
document.addEventListener('touchstart', requestAudioPermission, { once: true });
