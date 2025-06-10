// Service Worker for background notifications
const CACHE_NAME = 'restaurant-kitchen-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

// Handle background sync for order notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'order-sync') {
    event.waitUntil(syncOrders());
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event;
  const { orderNumber } = notification.data || {};

  event.notification.close();

  if (action === 'accept' && orderNumber) {
    // Focus or open the app and accept the order
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) {
          const client = clients[0];
          client.focus();
          client.postMessage({ 
            type: 'ACCEPT_ORDER', 
            orderNumber 
          });
        } else {
          self.clients.openWindow(`/?accept=${orderNumber}`);
        }
      })
    );
  } else if (action === 'view' || !action) {
    // Focus or open the app
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

// Handle push notifications (for future WooCommerce webhook integration)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || `Asiakas: ${data.customerName}\nSumma: ${data.total}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'order-notification',
      requireInteraction: true,
      actions: [
        { action: 'accept', title: 'Hyväksy' },
        { action: 'view', title: 'Näytä' }
      ],
      data: data
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Uusi tilaus', options)
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