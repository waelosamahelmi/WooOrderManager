import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { printReceipt } from "@/lib/print";
import type { Order } from "@shared/schema";

interface PrintPreviewProps {
  order: Order;
  onClose: () => void;
}

export function PrintPreview({ order, onClose }: PrintPreviewProps) {
  const { toast } = useToast();
  const items = JSON.parse(order.items || '[]');

  const printMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('PATCH', `/api/orders/${order.id}/print`, {});
      await printReceipt(order);
    },
    onSuccess: () => {
      toast({
        title: "Kuitti tulostettu!",
        description: "Tilauksen kuitti on lähetetty tulostimeen",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Tulostusvirhe",
        description: "Kuitin tulostaminen epäonnistui",
        variant: "destructive",
      });
    }
  });

  const handlePrint = () => {
    printMutation.mutate();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kuitin esikatselu</DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <div className="font-mono text-xs bg-gray-50 p-4 rounded border max-w-sm mx-auto leading-tight">
            {/* Header */}
            <div className="text-center border-b border-gray-400 pb-2 mb-2">
              <div className="font-bold text-sm">RAVINTOLA TIRVA</div>
              <div className="text-xs text-gray-600">[Restaurant Logo Here]</div>
            </div>
            
            {/* Order Info */}
            <div className="border-b border-gray-400 pb-2 mb-2 text-xs">
              <div>Tilaus #: {order.woocommerceId}</div>
              <div>Päivä: {new Date(order.receivedAt).toLocaleDateString('fi-FI')} {new Date(order.receivedAt).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}</div>
              <div>Tyyppi: {order.type === 'delivery' ? 'Toimitus' : 'Nouto'}</div>
            </div>
            
            {/* Order Items */}
            <div className="border-b border-gray-400 pb-2 mb-2">
              <div className="font-bold mb-1 text-xs">TILAUSTIEDOT:</div>
              <div className="space-y-1">
                {items.map((item: any, index: number) => (
                  <div key={index}>
                    <div className="flex justify-between text-xs">
                      <span>{item.quantity}x {item.name}</span>
                      <span>{item.price}</span>
                    </div>
                    {item.meta && item.meta.map((meta: any, metaIndex: number) => (
                      <div key={metaIndex} className="ml-2 text-xs">
                        + {meta.key}: {meta.value}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {order.notes && (
                <div className="mt-2">
                  <div className="font-bold text-xs">Lisätiedot:</div>
                  <div className="text-xs">"{order.notes}"</div>
                </div>
              )}
            </div>
            
            {/* Total */}
            <div className="border-b border-gray-400 pb-2 mb-2 text-xs">
              <div className="flex justify-between">
                <span>Välisumma:</span>
                <span>{order.subtotal}</span>
              </div>
              {order.deliveryFee && (
                <div className="flex justify-between">
                  <span>Toimitusmaksu:</span>
                  <span>{order.deliveryFee}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>YHTEENSÄ:</span>
                <span>{order.total}</span>
              </div>
            </div>
            
            {/* Customer Info */}
            <div className="border-b border-gray-400 pb-2 mb-2 text-xs">
              <div className="font-bold mb-1">ASIAKASTIEDOT:</div>
              <div>Nimi: {order.customerName}</div>
              <div>Puh: {order.customerPhone}</div>
              <div>Email: {order.customerEmail}</div>
              
              {order.type === 'delivery' && (
                <div className="mt-2">
                  <div className="font-bold">TOIMITUSOSOITE:</div>
                  <div>{order.addressStreet}</div>
                  <div>{order.addressCity}</div>
                  {order.addressInstructions && (
                    <div className="mt-1">
                      <div className="font-bold">Lisäohjeet:</div>
                      <div className="text-xs">"{order.addressInstructions}"</div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Timeline */}
            <div className="border-b border-gray-400 pb-2 mb-2 text-xs">
              <div>Tilaus vastaanotettu: {new Date(order.receivedAt).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}</div>
              {order.estimatedTime && (
                <div>Arvioitu valmistumisaika: {order.estimatedTime}</div>
              )}
            </div>
            
            {/* Footer */}
            <div className="text-center text-xs">
              <div>Kiitos tilauksesta!</div>
              <div className="text-xs">www.ravintolatirva.fi</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-200 pt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Peruuta
          </Button>
          <Button
            onClick={handlePrint}
            disabled={printMutation.isPending}
            className="flex-1 bg-green-700 hover:bg-green-800"
          >
            <Printer className="w-4 h-4 mr-2" />
            {printMutation.isPending ? 'Tulostetaan...' : 'Tulosta'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
