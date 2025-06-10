// PWA installation and management utilities

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function initializePWA(): void {
  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e as BeforeInstallPromptEvent;
    console.log('PWA install prompt available');
    
    // Show custom install UI if needed
    showInstallPromotion();
  });

  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
    hideInstallPromotion();
  });

  // Check if app is already installed
  if (isAppInstalled()) {
    console.log('PWA is already installed');
  }
}

export function isInstallable(): boolean {
  return deferredPrompt !== null;
}

export function isAppInstalled(): boolean {
  // Check if running in standalone mode (installed PWA)
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
}

export async function installApp(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }

  try {
    // Show the install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      deferredPrompt = null;
      return true;
    } else {
      console.log('User dismissed the install prompt');
      return false;
    }
  } catch (error) {
    console.error('Error installing PWA:', error);
    return false;
  }
}

function showInstallPromotion(): void {
  // Create a subtle install banner
  if (document.getElementById('pwa-install-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #2563eb;
    color: white;
    padding: 12px 16px;
    text-align: center;
    font-size: 14px;
    z-index: 9999;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transform: translateY(-100%);
    transition: transform 0.3s ease;
  `;

  banner.innerHTML = `
    <span>Asenna Tirva Keittiö sovelluksena</span>
    <div>
      <button id="pwa-install-btn" style="background: white; color: #2563eb; border: none; padding: 6px 12px; border-radius: 4px; margin-right: 8px; font-size: 12px;">Asenna</button>
      <button id="pwa-dismiss-btn" style="background: transparent; color: white; border: 1px solid white; padding: 6px 12px; border-radius: 4px; font-size: 12px;">Myöhemmin</button>
    </div>
  `;

  document.body.appendChild(banner);

  // Show banner after a delay
  setTimeout(() => {
    banner.style.transform = 'translateY(0)';
  }, 2000);

  // Add event listeners
  document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
    const installed = await installApp();
    if (installed || !isInstallable()) {
      hideInstallPromotion();
    }
  });

  document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
    hideInstallPromotion();
    // Remember dismissal for this session
    sessionStorage.setItem('pwa-dismissed', 'true');
  });
}

function hideInstallPromotion(): void {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.style.transform = 'translateY(-100%)';
    setTimeout(() => banner.remove(), 300);
  }
}

// Mobile-specific optimizations
export function optimizeForMobile(): void {
  // Prevent zoom on double-tap
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Add touch feedback
  document.addEventListener('touchstart', (event) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      target.style.opacity = '0.7';
    }
  });

  document.addEventListener('touchend', (event) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      setTimeout(() => {
        target.style.opacity = '';
      }, 100);
    }
  });

  // Optimize for mobile browsers
  if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    document.body.classList.add('mobile-device');
    
    // Add mobile-specific styles
    const style = document.createElement('style');
    style.textContent = `
      .mobile-device * {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      
      .mobile-device input, .mobile-device textarea {
        -webkit-user-select: text;
        -khtml-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
      }
    `;
    document.head.appendChild(style);
  }
}