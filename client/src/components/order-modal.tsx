import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Check, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Order } from "@shared/schema";

interface OrderModalProps {
  order: Order;
  onClose: () => void;
  onPrint: () => void;
  getStatusText: (status: string) => string;
  onStatusUpdate: () => void;
}

export function OrderModal({ order, onClose, onPrint, getStatusText, onStatusUpdate }: OrderModalProps) {
  const { toast } = useToast();
  const items = JSON.parse(order.items || '[]');

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest('PATCH', `/api/orders/${order.id}/status`, { status });
    },
    onSuccess: () => {
      onStatusUpdate();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Virhe",
        description: "Tilauksen tilan päivitys epäonnistui",
        variant: "destructive",
      });
    }
  });

  const handleAcceptOrder = () => {
    updateStatusMutation.mutate('processing');
    toast({
      title: "Tilaus hyväksytty!",
      description: "Tilaus on siirretty valmistukseen",
    });
  };

  const handleRefuseOrder = () => {
    updateStatusMutation.mutate('refused');
    toast({
      title: "Tilaus hylätty",
      description: "Tilaus on peruutettu",
      variant: "destructive",
    });
  };

  const handleCompleteOrder = () => {
    updateStatusMutation.mutate('completed');
    toast({
      title: "Tilaus valmis!",
      description: "Tilaus on merkitty valmiiksi",
    });
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold text-gray-800">
                Tilaus #{order.woocommerceId}
              </div>
              <div className="text-sm text-gray-500">
                {new Date(order.receivedAt).toLocaleDateString('fi-FI')} {new Date(order.receivedAt).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Tila:</span>
            <Badge className={`${getStatusColor(order.status)} text-white`}>
              {getStatusText(order.status)}
            </Badge>
          </div>

          {/* Order Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Tyyppi:</span>
            <span className="text-sm font-medium">
              {order.type === 'delivery' ? 'Toimitus' : 'Nouto'}
            </span>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tilaustiedot</h3>
            <div className="space-y-3">
              {items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">
                      {item.quantity}x {item.name}
                    </div>
                    {item.meta && item.meta.length > 0 && (
                      <div className="ml-4 space-y-1">
                        {item.meta.map((meta: any, metaIndex: number) => (
                          <div key={metaIndex} className="text-sm text-gray-600">
                            + {meta.key}: {meta.value}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="font-medium">{item.price}</div>
                </div>
              ))}
            </div>
            
            {/* Special Instructions */}
            {order.notes && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800">Lisätiedot:</p>
                <p className="text-sm text-yellow-700">"{order.notes}"</p>
              </div>
            )}
          </div>

          {/* Order Total */}
          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Välisumma:</span>
                <span className="text-sm">{order.subtotal}</span>
              </div>
              {order.deliveryFee && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Toimitusmaksu:</span>
                  <span className="text-sm">{order.deliveryFee}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Yhteensä:</span>
                <span>{order.total}</span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Asiakastiedot</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-600">Nimi:</span>
                <span className="ml-2">{order.customerName}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Puhelin:</span>
                <span className="ml-2">{order.customerPhone}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Sähköposti:</span>
                <span className="ml-2">{order.customerEmail}</span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          {order.type === 'delivery' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Toimitusosoite</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p>{order.addressStreet}</p>
                <p>{order.addressCity}</p>
                {order.addressInstructions && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-600">Lisäohjeet:</p>
                    <p className="text-sm text-gray-700">"{order.addressInstructions}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Aikajana</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tilaus vastaanotettu:</span>
                <span className="text-sm font-medium">
                  {new Date(order.receivedAt).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {order.estimatedTime && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Arvioitu valmistumisaika:</span>
                  <span className="text-sm font-medium text-green-700">{order.estimatedTime}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
          {order.status === 'pending' && (
            <>
              <Button
                variant="destructive"
                onClick={handleRefuseOrder}
                disabled={updateStatusMutation.isPending}
                className="flex items-center justify-center"
              >
                <X className="w-4 h-4 mr-2" />
                Hylkää tilaus
              </Button>
              <Button
                onClick={handleAcceptOrder}
                disabled={updateStatusMutation.isPending}
                className="flex items-center justify-center bg-green-700 hover:bg-green-800"
              >
                <Check className="w-4 h-4 mr-2" />
                Hyväksy tilaus
              </Button>
            </>
          )}
          
          {order.status === 'processing' && (
            <Button
              onClick={handleCompleteOrder}
              disabled={updateStatusMutation.isPending}
              className="flex items-center justify-center bg-green-700 hover:bg-green-800"
            >
              <Check className="w-4 h-4 mr-2" />
              Merkitse valmiiksi
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={onPrint}
            className="flex items-center justify-center"
          >
            <Printer className="w-4 h-4 mr-2" />
            Tulosta kuitti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
