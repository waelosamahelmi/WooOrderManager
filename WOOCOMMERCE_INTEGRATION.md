# WooCommerce Integration Guide for Ravintola Tirva Kitchen System

## Step 1: WooCommerce Store Setup

### 1.1 Install Required Plugins
1. Log into your WordPress admin panel at `https://mediumorchid-yak-784527.hostingersite.com/wp-admin`
2. Go to **Plugins > Add New**
3. Install and activate:
   - **WooCommerce** (core plugin)
   - **WooCommerce Webhooks** (if not included in core)

### 1.2 Configure WooCommerce Settings
1. Go to **WooCommerce > Settings**
2. Configure store location: Finland
3. Set currency to EUR (€)
4. Configure shipping zones for Helsinki area

## Step 2: API Key Generation

### 2.1 Create REST API Key
1. Go to **WooCommerce > Settings > Advanced > REST API**
2. Click **Add Key**
3. Fill in details:
   - **Description**: "Ravintola Tirva Kitchen System"
   - **User**: Select admin user
   - **Permissions**: Read/Write
4. Click **Generate API Key**
5. **IMPORTANT**: Copy the Consumer Key and Consumer Secret immediately

### 2.2 API Credentials Format
```
Consumer Key: ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Consumer Secret: cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 3: Webhook Configuration

### 3.1 Add New Webhook
1. Go to **WooCommerce > Settings > Advanced > Webhooks**
2. Click **Add Webhook**
3. Configure webhook:
   - **Name**: "Kitchen Order Notification"
   - **Status**: Active
   - **Topic**: Order created
   - **Delivery URL**: `https://your-replit-app.replit.app/api/webhook/woocommerce`
   - **Secret**: Generate a strong secret key (save this!)
   - **API Version**: WC/v3

### 3.2 Test Webhook
1. Save the webhook configuration
2. Create a test order in WooCommerce
3. Check the webhook delivery logs for successful delivery

## Step 4: Kitchen System Configuration

### 4.1 Update Settings in Kitchen App
1. Open your kitchen management system
2. Click the settings icon (gear)
3. In WooCommerce section, enter:
   - **Store URL**: `https://helmies.fi`
   - **Consumer Key**: Your generated consumer key
   - **Consumer Secret**: Your generated consumer secret
   - **Webhook Secret**: The secret you generated for webhook

### 4.2 Test Connection
1. Click "Test Connection" in settings
2. Verify green status indicator appears
3. Create a test order to verify webhook delivery

## Step 5: Network Printer Setup

### 5.1 Printer Configuration
1. Connect your receipt printer to the network
2. Configure static IP address for the printer
3. Note the printer's IP address and port (usually 9100)
4. In kitchen system settings:
   - **Printer Type**: Network Printer
   - **IP Address**: Your printer's IP (e.g., 192.168.1.100)
   - **Port**: 9100 (standard ESC/POS port)
   - **Name**: Descriptive name for the printer

### 5.2 Test Printing
1. Click "Test Printer" in settings
2. Verify test receipt prints correctly
3. Adjust print density/speed as needed on printer

## Step 6: Order Flow Configuration

### 6.1 Order Status Mapping
WooCommerce → Kitchen System:
- `pending` → `pending` (awaiting acceptance)
- `processing` → `processing` (accepted, being prepared)
- `completed` → `completed` (ready for delivery/pickup)
- `cancelled` → `refused` (order rejected)

### 6.2 Automatic Actions
- New orders automatically trigger notifications
- Audio alerts play for new orders
- Service worker enables background notifications
- Receipts auto-print when orders are accepted

## Step 7: Production Deployment

### 7.1 SSL Certificate
Ensure your Replit app has HTTPS enabled for webhook security.

### 7.2 Webhook Security
Verify webhook signatures to prevent unauthorized access:
```php
// In your WooCommerce webhook endpoint
$signature = hash_hmac('sha256', $body, $webhook_secret);
$expected = 'sha256=' . $signature;
// Compare with X-WC-Webhook-Signature header
```

### 7.3 Error Handling
Monitor webhook delivery failures and implement retry logic.

## Step 8: Testing Checklist

### 8.1 End-to-End Test
1. ✅ Customer places order on helmies.fi
2. ✅ Webhook delivers order to kitchen system
3. ✅ Kitchen receives notification and audio alert
4. ✅ Staff can accept/refuse order
5. ✅ Receipt prints automatically
6. ✅ Order status updates in WooCommerce
7. ✅ Customer receives status update

### 8.2 Error Scenarios
- Test webhook delivery failures
- Test printer offline scenarios
- Test network disconnections
- Verify order deduplication

## Step 9: Go Live

### 9.1 Final Configuration
1. Update webhook URL to production domain
2. Configure printer with final network settings
3. Train kitchen staff on system usage
4. Set up monitoring for system health

### 9.2 Staff Training Points
- How to accept/refuse orders
- How to print receipts manually if needed
- How to view order details
- How to handle system alerts

## Troubleshooting

### Common Issues
1. **Webhook not triggering**: Check webhook URL and status
2. **Printer not working**: Verify IP address and network connectivity
3. **Notifications not appearing**: Check browser notification permissions
4. **Orders not updating**: Verify API credentials

### Support Contacts
- WooCommerce API Documentation: https://woocommerce.github.io/woocommerce-rest-api-docs/
- Webhook Testing Tool: https://webhook.site/

## Security Notes
- Keep API keys secure and rotate regularly
- Use HTTPS for all webhook communications
- Implement webhook signature validation
- Monitor for suspicious webhook activity