import type { Order } from "@shared/schema";

export async function printReceipt(order: Order) {
  const items = JSON.parse(order.items || '[]');
  
  // Create receipt HTML for printing
  const receiptHtml = `
    <html>
      <head>
        <title>Kuitti - Tilaus #${order.woocommerceId}</title>
        <style>
          @media print {
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
              margin: 0;
              padding: 10px;
              width: 58mm;
            }
            .receipt {
              width: 100%;
            }
            .header {
              text-align: center;
              border-bottom: 1px solid #000;
              padding-bottom: 5px;
              margin-bottom: 5px;
            }
            .section {
              border-bottom: 1px solid #000;
              padding-bottom: 5px;
              margin-bottom: 5px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            .item-meta {
              margin-left: 10px;
              font-size: 10px;
            }
            .bold {
              font-weight: bold;
            }
            .center {
              text-align: center;
            }
            .small {
              font-size: 10px;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <!-- Header -->
          <div class="header">
            <div class="bold">RAVINTOLA TIRVA</div>
            <div class="small">[Restaurant Logo Here]</div>
          </div>
          
          <!-- Order Info -->
          <div class="section">
            <div>Tilaus #: ${order.woocommerceId}</div>
            <div>Päivä: ${new Date(order.receivedAt).toLocaleDateString('fi-FI')} ${new Date(order.receivedAt).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}</div>
            <div>Tyyppi: ${order.type === 'delivery' ? 'Toimitus' : 'Nouto'}</div>
          </div>
          
          <!-- Order Items -->
          <div class="section">
            <div class="bold">TILAUSTIEDOT:</div>
            <br>
            ${items.map((item: any) => `
              <div class="row">
                <span>${item.quantity}x ${item.name}</span>
                <span>${item.price}</span>
              </div>
              ${item.meta ? item.meta.map((meta: any) => `
                <div class="item-meta">+ ${meta.key}: ${meta.value}</div>
              `).join('') : ''}
            `).join('')}
            
            ${order.notes ? `
              <br>
              <div class="bold">Lisätiedot:</div>
              <div class="small">"${order.notes}"</div>
            ` : ''}
          </div>
          
          <!-- Total -->
          <div class="section">
            <div class="row">
              <span>Välisumma:</span>
              <span>${order.subtotal}</span>
            </div>
            ${order.deliveryFee ? `
              <div class="row">
                <span>Toimitusmaksu:</span>
                <span>${order.deliveryFee}</span>
              </div>
            ` : ''}
            <div class="row bold">
              <span>YHTEENSÄ:</span>
              <span>${order.total}</span>
            </div>
          </div>
          
          <!-- Customer Info -->
          <div class="section">
            <div class="bold">ASIAKASTIEDOT:</div>
            <div>Nimi: ${order.customerName}</div>
            <div>Puh: ${order.customerPhone}</div>
            <div>Email: ${order.customerEmail}</div>
            
            ${order.type === 'delivery' ? `
              <br>
              <div class="bold">TOIMITUSOSOITE:</div>
              <div>${order.addressStreet}</div>
              <div>${order.addressCity}</div>
              
              ${order.addressInstructions ? `
                <br>
                <div class="bold">Lisäohjeet:</div>
                <div class="small">"${order.addressInstructions}"</div>
              ` : ''}
            ` : ''}
          </div>
          
          <!-- Timeline -->
          <div class="section">
            <div>Tilaus vastaanotettu: ${new Date(order.receivedAt).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}</div>
            ${order.estimatedTime ? `
              <div>Arvioitu valmistumisaika: ${order.estimatedTime}</div>
            ` : ''}
          </div>
          
          <!-- Footer -->
          <div class="center">
            <div>Kiitos tilauksesta!</div>
            <div class="small">www.ravintolatirva.fi</div>
          </div>
        </div>
      </body>
    </html>
  `;
  
  // Open print window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  } else {
    throw new Error('Popup blocked - unable to open print window');
  }
}
