import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@shared/schema";

interface OrderCardProps {
  order: Order;
  onClick: () => void;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
}

export function OrderCard({ order, onClick, getStatusColor, getStatusText }: OrderCardProps) {
  const items = JSON.parse(order.items || '[]');
  const timeAgo = new Date(order.receivedAt).toLocaleTimeString('fi-FI', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Tilaus #{order.woocommerceId}
            </h3>
            <p className="text-sm text-gray-500">
              {timeAgo} - {Math.round((Date.now() - new Date(order.receivedAt).getTime()) / 60000)} min sitten
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              className={`${getStatusColor(order.status)} text-white`}
            >
              {getStatusText(order.status)}
            </Badge>
            {order.status === 'pending' && (
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
            )}
          </div>
        </div>
        
        <div className="space-y-3 mb-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Tyyppi:</span>
            <span className="text-sm font-medium">
              {order.type === 'delivery' ? 'Toimitus' : 'Nouto'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Asiakas:</span>
            <span className="text-sm font-medium">{order.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Yhteensä:</span>
            <span className="text-lg font-bold text-green-700">{order.total}</span>
          </div>
        </div>
        
        <div className="border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-600 mb-2">Tuotteet:</p>
          <div className="space-y-1">
            {items.slice(0, 2).map((item: any, index: number) => (
              <div key={index} className="text-sm">
                {item.quantity}x {item.name}
              </div>
            ))}
            {items.length > 2 && (
              <div className="text-sm text-gray-500">
                +{items.length - 2} muuta tuotetta
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
