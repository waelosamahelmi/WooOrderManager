import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, X, Check, Eye } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@shared/schema";

interface NotificationPopupProps {
  order: Order;
  onClose: () => void;
  onAccept: () => void;
  onRefuse: () => void;
  onView: () => void;
}

export function NotificationPopup({ order, onClose, onAccept, onRefuse, onView }: NotificationPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Slide in animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-hide after 10 seconds
    const autoHideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoHideTimer);
    };
  }, [onClose]);

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest('PATCH', `/api/orders/${order.id}/status`, { status });
    },
    onSuccess: (_, status) => {
      if (status === 'processing') {
        toast({
          title: "Tilaus hyväksytty!",
          description: "Tilaus on siirretty valmistukseen",
        });
        onAccept();
      } else if (status === 'refused') {
        toast({
          title: "Tilaus hylätty",
          description: "Tilaus on peruutettu",
          variant: "destructive",
        });
        onRefuse();
      }
    },
    onError: () => {
      toast({
        title: "Virhe",
        description: "Tilauksen käsittely epäonnistui",
        variant: "destructive",
      });
    }
  });

  const handleQuickAccept = () => {
    updateStatusMutation.mutate('processing');
  };

  const handleQuickRefuse = () => {
    updateStatusMutation.mutate('refused');
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div 
      className={`fixed top-4 right-4 z-50 transform transition-transform duration-300 ${
        isVisible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <Card className="w-80 shadow-2xl border-l-4 border-yellow-500">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell className="text-white w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-800 mb-1">Uusi tilaus!</h4>
              <p className="text-sm text-gray-600 mb-3 truncate">
                Tilaus #{order.woocommerceId} - {order.customerName}
              </p>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleQuickRefuse}
                  disabled={updateStatusMutation.isPending}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Hylkää
                </Button>
                <Button
                  size="sm"
                  onClick={handleQuickAccept}
                  disabled={updateStatusMutation.isPending}
                  className="text-xs bg-green-700 hover:bg-green-800"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Hyväksy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onView}
                  className="text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Näytä
                </Button>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClose}
              className="p-1 h-auto text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
