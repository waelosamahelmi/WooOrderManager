// Enhanced Service Worker for Ravintola Tirva Kitchen App
const CACHE_NAME = 'ravintola-tirva-v1.2.0';

self.addEventListener('install', (event) => {
  console.log('Enhanced Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Enhanced Service Worker activating');
  event.waitUntil(self.clients.claim());
});

// Enhanced background sync for order notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'order-sync') {
    event.waitUntil(syncOrders());
  }
});

// Enhanced notification click handling
self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event;
  const { orderNumber, woocommerceId } = notification.data || {};
  const orderId = orderNumber || woocommerceId;

  event.notification.close();

  if (action === 'accept' && orderId) {
    // Focus or open the app and accept the order
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) {
          const client = clients[0];
          client.focus();
          client.postMessage({ 
            type: 'ACCEPT_ORDER', 
            orderNumber: orderId
          });
        } else {
          self.clients.openWindow(`/?accept=${orderId}`);
        }
      })
    );
  } else if (action === 'refuse' && orderId) {
    // Focus or open the app and refuse the order
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) {
          const client = clients[0];
          client.focus();
          client.postMessage({ 
            type: 'REFUSE_ORDER', 
            orderNumber: orderId
          });
        } else {
          self.clients.openWindow(`/?refuse=${orderId}`);
        }
      })
    );
  } else {
    // Default action - focus or open the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          self.clients.openWindow('/');
        }
      })
    );
  }
});

// Enhanced push notifications with better action support
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || `Asiakas: ${data.customerName || 'Tuntematon'}\nSumma: ${data.total || 'Ei summaa'}`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'order-notification',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: data,
      actions: [
        { action: 'accept', title: 'Hyväksy tilaus' },
        { action: 'refuse', title: 'Hylkää tilaus' }
      ],
      timestamp: Date.now(),
      renotify: true
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || `Uusi tilaus #${data.orderNumber || data.woocommerceId}`, 
        options
      )
    );
  }
});

async function syncOrders() {
  try {
    // This would sync with your backend to check for new orders
    const response = await fetch('/api/orders/sync');
    const orders = await response.json();
    
    // Show notifications for new orders
    orders.forEach(order => {
      if (!order.notified) {
        self.registration.showNotification(`Uusi tilaus #${order.orderNumber}`, {
          body: `Asiakas: ${order.customerName}\nSumma: ${order.total}`,
          icon: '/favicon.ico',
          tag: 'order-notification',
          requireInteraction: true,
          data: order
        });
      }
    });
  } catch (error) {
    console.error('Order sync failed:', error);
  }
}