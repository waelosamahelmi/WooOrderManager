import { useState, useEffect } from "react";
import { useOrders } from "@/hooks/use-orders";
import { useWebSocket } from "@/hooks/use-websocket";
import { OrderCard } from "@/components/order-card";
import { OrderModal } from "@/components/order-modal";
import { SettingsModal } from "@/components/settings-modal";
import { NotificationPopup } from "@/components/notification-popup";
import { PrintPreview } from "@/components/print-preview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Utensils, Wifi, Plus, LogOut } from "lucide-react";
import { playNotificationSound } from "@/lib/audio";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Order } from "@shared/schema";

type OrderStatus = "all" | "pending" | "processing" | "completed" | "refused";

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState<OrderStatus>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [newOrderNotification, setNewOrderNotification] = useState<Order | null>(null);
  const { toast } = useToast();
  const { logout } = useAuth();

  const { data: orders = [], isLoading, refetch } = useOrders();
  
  const createTestOrderMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/test/order', {});
    },
    onSuccess: (newOrder: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setNewOrderNotification(newOrder);
      playNotificationSound();
      toast({
        title: "Testijärjestys luotu!",
        description: "Uusi testijärjestys on lisätty järjestelmään",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Virhe",
        description: "Testijärjestyksen luominen epäonnistui",
        variant: "destructive",
      });
    }
  });
  // Temporarily disable WebSocket to fix connection issues
  const { isConnected } = useWebSocket({
    onMessage: (data) => {
      if (data.type === 'NEW_ORDER') {
        setNewOrderNotification(data.data);
        playNotificationSound();
        refetch();
        
        // Show service worker notification for background support
        if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(`Uusi tilaus #${data.data.orderNumber}`, {
              body: `Asiakas: ${data.data.customerName}\nSumma: ${data.data.total}`,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: 'order-notification',
              requireInteraction: true,

              data: data.data
            });
          });
        }
      } else if (data.type === 'ORDER_STATUS_UPDATE') {
        refetch();
      }
    }
  });

  // Initialize service worker and notifications on mount
  useEffect(() => {
    const initializeNotifications = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered for background notifications');
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    };

    initializeNotifications();
  }, []);

  const filteredOrders = orders.filter(order => {
    if (activeFilter === "all") return true;
    return order.status === activeFilter;
  });

  const orderCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    processing: orders.filter(o => o.status === "processing").length,
    completed: orders.filter(o => o.status === "completed").length,
    refused: orders.filter(o => o.status === "refused").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "processing": return "bg-blue-500";
      case "completed": return "bg-green-500";
      case "refused": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Odottaa";
      case "processing": return "Valmistuksessa";
      case "completed": return "Valmis";  
      case "refused": return "Hylätty";
      default: return status;
    }
  };

  const filterButtons = [
    { key: "all" as const, label: "Kaikki tilaukset", count: orderCounts.all },
    { key: "pending" as const, label: "Odottaa", count: orderCounts.pending },
    { key: "processing" as const, label: "Valmistuksessa", count: orderCounts.processing },
    { key: "completed" as const, label: "Valmis", count: orderCounts.completed },
    { key: "refused" as const, label: "Hylätty", count: orderCounts.refused },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center">
                  <Utensils className="text-white text-sm" />
                </div>
                <h1 className="text-xl font-bold text-gray-800">Ravintola Tirva</h1>
              </div>
              <span className="text-sm text-gray-500">Keittiö</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Yhdistetty' : 'Ei yhteyttä'}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => createTestOrderMutation.mutate()}
                disabled={createTestOrderMutation.isPending}
                className="text-green-700 border-green-700 hover:bg-green-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                {createTestOrderMutation.isPending ? 'Luodaan...' : 'Testi tilaus'}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 hover:text-gray-800"
              >
                <Settings className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="p-2 text-red-600 hover:text-red-800"
                title="Kirjaudu ulos"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Order Filters */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 sm:gap-4">
            {filterButtons.map(({ key, label, count }) => (
              <Button
                key={key}
                variant={activeFilter === key ? "default" : "outline"}
                onClick={() => setActiveFilter(key)}
                className={`${
                  activeFilter === key 
                    ? 'bg-green-700 text-white hover:bg-green-800' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } font-medium`}
              >
                {label}
                <Badge 
                  variant="secondary" 
                  className={`ml-2 ${
                    activeFilter === key 
                      ? 'bg-white text-green-700' 
                      : getStatusColor(key === 'all' ? 'pending' : key) + ' text-white'
                  }`}
                >
                  {count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Order Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => setSelectedOrder(order)}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Utensils className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ei tilauksia</h3>
            <p className="text-gray-500">Uudet tilaukset näkyvät tässä automaattisesti</p>
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onPrint={() => {
            setShowPrintPreview(true);
          }}
          getStatusText={getStatusText}
          onStatusUpdate={() => refetch()}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {showPrintPreview && selectedOrder && (
        <PrintPreview
          order={selectedOrder}
          onClose={() => setShowPrintPreview(false)}
        />
      )}

      {newOrderNotification && (
        <NotificationPopup
          order={newOrderNotification}
          onClose={() => setNewOrderNotification(null)}
          onAccept={() => {
            setNewOrderNotification(null);
            refetch();
          }}
          onRefuse={() => {
            setNewOrderNotification(null);
            refetch();
          }}
          onView={() => {
            setSelectedOrder(newOrderNotification);
            setNewOrderNotification(null);
          }}
        />
      )}
    </div>
  );
}
