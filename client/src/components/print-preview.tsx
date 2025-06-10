import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Printer } from "lucide-react";
import type { Order } from "@shared/schema";

interface PrintPreviewProps {
  order: Order;
  onClose: () => void;
}

export function PrintPreview({ order, onClose }: PrintPreviewProps) {
  const formatReceiptText = () => {
    const lines = [];
    
    // Header
    lines.push("=====================================");
    lines.push("         RAVINTOLA TIRVA");
    lines.push("=====================================");
    lines.push("");
    
    // Order info
    lines.push(`Tilaus: #${order.woocommerceId}`);
    lines.push(`Päivämäärä: ${new Date(order.receivedAt).toLocaleString('fi-FI')}`);
    lines.push(`Tyyppi: ${order.type === 'delivery' ? 'Kotiinkuljetus' : 'Nouto'}`);
    lines.push("");
    
    // Customer info
    lines.push("ASIAKASTIEDOT:");
    lines.push(`Nimi: ${order.customerName}`);
    if (order.customerPhone) {
      lines.push(`Puhelin: ${order.customerPhone}`);
    }
    if (order.customerEmail) {
      lines.push(`Sähköposti: ${order.customerEmail}`);
    }
    lines.push("");
    
    // Delivery address if applicable
    if (order.type === 'delivery' && order.deliveryAddress) {
      lines.push("TOIMITUSOSOITE:");
      lines.push(order.deliveryAddress);
      lines.push("");
    }
    
    // Order items
    lines.push("TILAUKSEN SISÄLTÖ:");
    lines.push("-------------------------------------");
    
    try {
      const items = JSON.parse(order.items);
      items.forEach((item: any) => {
        lines.push(`${item.quantity}x ${item.name}`);
        if (item.price) {
          lines.push(`    ${parseFloat(item.price).toFixed(2)}€`);
        }
        if (item.meta && item.meta.length > 0) {
          item.meta.forEach((meta: any) => {
            lines.push(`    - ${meta.key}: ${meta.value}`);
          });
        }
        lines.push("");
      });
    } catch (e) {
      lines.push("Tilauksen tiedot ei saatavilla");
      lines.push("");
    }
    
    lines.push("-------------------------------------");
    
    // Totals
    if (order.subtotal) {
      lines.push(`Välisumma: ${order.subtotal}€`);
    }
    if (order.deliveryFee) {
      lines.push(`Toimitusmaksu: ${order.deliveryFee}€`);
    }
    if (order.taxAmount) {
      lines.push(`ALV: ${order.taxAmount}€`);
    }
    lines.push(`YHTEENSÄ: ${order.total}€`);
    lines.push("");
    
    // Payment info
    if (order.paymentMethod) {
      lines.push(`Maksutapa: ${order.paymentMethod}`);
    }
    lines.push("");
    
    // Notes
    if (order.notes) {
      lines.push("HUOMIOT:");
      lines.push(order.notes);
      lines.push("");
    }
    
    // Footer
    lines.push("=====================================");
    lines.push("        Kiitos tilauksestasi!");
    lines.push("=====================================");
    
    return lines.join('\n');
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(formatReceiptText());
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Tulostuksen esikatselu - Tilaus #{order.woocommerceId}
            </span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Kuitti näyttäisi tältä tulostettuna:</h3>
            <div className="bg-white border border-gray-200 p-4 rounded font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
              {formatReceiptText()}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCopyToClipboard} variant="outline" className="flex-1">
              Kopioi leikepöydälle
            </Button>
            <Button onClick={onClose} className="flex-1">
              Sulje
            </Button>
          </div>

          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <p className="font-semibold mb-1">💡 Tulostimen testaus:</p>
            <p>Kun sinulla on verkkotulostin käytettävissä:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Varmista että tulostin on samassa verkossa</li>
              <li>Aseta tulostimen IP-osoite asetuksissa</li>
              <li>Tulostin tukee ESC/POS komentoja (useimmat keittiötulosttimet)</li>
              <li>Portti on yleensä 9100 (voidaan muuttaa asetuksissa)</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}