import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { settingsService } from './settingsService';

const generateHtmlContent = (order, settings, taxRate) => {
  const date = order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.timestamp || Date.now());
  const formattedDate = date.toLocaleString('en-US', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  });

  const paymentRows = (order.payments || []).map(p => `
    <div class="total-row mini">
      <span>${p.method.toUpperCase()} Payment</span>
      <span>$${(p.amount || 0).toFixed(2)}</span>
    </div>
  `).join('');

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
            .receipt-card { max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 12px; }
            .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px dashed #e2e8f0; }
            .logo { font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: -1px; margin-bottom: 4px; }
            .store-info { font-size: 13px; color: #64748b; }
            .order-meta { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; }
            
            .customer-box { background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3b82f6; }
            .customer-label { font-size: 10px; color: #64748b; margin-bottom: 2px; }
            .customer-name { font-size: 14px; font-weight: 700; color: #1e293b; }

            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .items-table th { text-align: left; border-bottom: 1px solid #e2e8f0; padding: 12px 0; color: #94a3b8; font-size: 11px; text-transform: uppercase; }
            .items-table td { padding: 14px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
            .item-name { font-weight: 700; font-size: 14px; color: #0f172a; }
            .item-variant { font-size: 11px; color: #3b82f6; font-weight: 700; text-transform: uppercase; margin-top: 2px; }
            .item-bundle { font-size: 11px; color: #64748b; font-style: italic; margin-top: 4px; }
            .item-price { font-size: 13px; color: #64748b; }

            .totals-section { margin-top: 20px; border-top: 2px solid #0f172a; padding-top: 15px; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
            .total-row.mini { font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; margin-top: 4px; padding-top: 8px; }
            .total-row.saving { color: #10b981; font-weight: 600; }
            .total-row.grand { font-size: 24px; font-weight: 900; color: #0f172a; margin-top: 10px; padding-top: 15px; border-top: 1px solid #e2e8f0; }

            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <div class="header">
              <div class="logo">${settings.logoText || 'xPOS'}</div>
              <div class="store-info">
                <strong>${settings.storeName || 'xPOS Retail'}</strong><br/>
                ${settings.address || 'Global Headquarters'}<br/>
                ${settings.phone || '+1 (555) 000-0000'}
              </div>
            </div>

            <div class="order-meta">
              <span>Receipt #${order.id?.slice(-8).toUpperCase()}</span>
              <span>${formattedDate}</span>
            </div>

            ${order.customerName ? `
              <div class="customer-box">
                <div class="customer-label">Valued Customer</div>
                <div class="customer-name">${order.customerName}</div>
              </div>
            ` : ''}

            <table class="items-table">
              <thead>
                <tr>
                  <th>Items & Details</th>
                  <th style="text-align: center; width: 50px;">Qty</th>
                  <th style="text-align: right; width: 80px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${(order.items || []).map(item => `
                  <tr>
                    <td>
                      <div class="item-name">${item.name}</div>
                      ${item.variantName ? `<div class="item-variant">${item.variantName}</div>` : ''}
                      ${item.isBundle && item.bundleItems ? `
                        <div class="item-bundle">Includes: ${item.bundleItems.map(bi => `${bi.name} x${bi.quantity}`).join(', ')}</div>
                      ` : ''}
                      <div class="item-price">$${(item.price || 0).toFixed(2)} each</div>
                    </td>
                    <td style="text-align: center; font-weight: 600;">${item.quantity}</td>
                    <td style="text-align: right; font-weight: 700;">$${((item.price || 0) * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals-section">
              <div class="total-row">
                <span>Subtotal</span>
                <span>$${(order.subTotal || 0).toFixed(2)}</span>
              </div>
              
              <div class="total-row">
                <span>Tax (${(taxRate || 5).toFixed(1)}%)</span>
                <span>$${(order.tax || 0).toFixed(2)}</span>
              </div>

              ${order.tipAmount > 0 ? `
                <div class="total-row">
                  <span>Service Tip</span>
                  <span>$${(order.tipAmount || 0).toFixed(2)}</span>
                </div>
              ` : ''}

              ${order.discountAmount > 0 ? `
                <div class="total-row saving">
                  <span>Total Savings</span>
                  <span>-$${(order.discountAmount || 0).toFixed(2)}</span>
                </div>
              ` : ''}

              <div class="total-row grand">
                <span>Total Due</span>
                <span>$${(order.totalAmount || 0).toFixed(2)}</span>
              </div>

              <div style="margin-top: 20px;">
                <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 800; margin-bottom: 8px;">Payment Breakdown</div>
                ${paymentRows}
              </div>
            </div>

            <div class="footer">
              <p>Thank you for choosing ${settings.storeName || 'xPOS'}!</p>
              <p>Items sold are subject to our return policy.<br/>Please visit our website for more details.</p>
              <div style="margin-top: 15px; font-weight: 800; color: #e2e8f0;">••••••••••••••••••••••••</div>
            </div>
          </div>
        </body>
      </html>
    `;
};

export const receiptService = {
  /**
   * Generates and prints a receipt for an order
   * @param {Object} order - The order data
   */
  generateReceipt: async (order) => {
    try {
      const settings = (await settingsService.getSettings()) || {};
      const taxRate = settings.taxRate || 5.0;
      const htmlContent = generateHtmlContent(order, settings, taxRate);
      
      await Print.printAsync({ html: htmlContent });
    } catch (error) {
      console.error("Error generating receipt:", error);
      throw error;
    }
  },

  /**
   * Generates a PDF receipt and opens native share dialog
   * @param {Object} order - The order data
   */
  emailReceipt: async (order) => {
    try {
      const settings = (await settingsService.getSettings()) || {};
      const taxRate = settings.taxRate || 5.0;
      const htmlContent = generateHtmlContent(order, settings, taxRate);
      
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Receipt',
          UTI: 'com.adobe.pdf',
        });
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error("Error sharing receipt:", error);
      throw error;
    }
  }
};
