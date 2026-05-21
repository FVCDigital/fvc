# MoonPay Integration Testing Guide

## Environment Setup

### Development (.env.local for dapp)
```bash
NEXT_PUBLIC_MOONPAY_API_KEY=pk_test_xxx
NEXT_PUBLIC_MOONPAY_ENVIRONMENT=sandbox
```

### Server (.env)
```bash
MOONPAY_API_KEY=pk_test_xxx
MOONPAY_PUBLIC_KEY=pk_test_xxx  # Alias for API key
MOONPAY_SECRET_KEY=sk_test_xxx  # For URL signing (production)
MOONPAY_WEBHOOK_KEY=wk_xxx      # For webhook verification
MOONPAY_ENVIRONMENT=sandbox     # sandbox or production
```

## Sandbox Testing

### Test Cards
| Card Number | Type | Result |
|-------------|------|--------|
| 4000 0209 5159 5032 | Visa | Success |
| 4000 0000 0000 0002 | Visa | Decline |
| 5200 0000 0000 0007 | Mastercard | Success |

Use any:
- CVV: 123
- Expiry: Any future date
- Name: Any name
- Address: Any valid address

### E2E Test Flow

1. **Navigate to Buy FVC page**
   - Go to fvcdigital.com/buy-fvc
   - Connect wallet

2. **Select Card Payment**
   - Click "Credit/Debit Card" option
   - Currency selection modal appears
   - Select USDC/USDT/ETH

3. **MoonPay Widget Opens**
   - Widget should show in overlay mode
   - Pre-filled with wallet address
   - Currency should match selection
   - Theme should be dark with #6A70E4 accent

4. **Complete Test Purchase**
   - Use test card: 4000 0209 5159 5032
   - Complete KYC (sandbox uses mock data)
   - Confirm purchase

5. **Transaction Completion**
   - Widget shows success
   - Alert shows "Purchase successful!"
   - In sandbox, crypto arrives immediately
   - User can proceed to buy FVC with received crypto

### Webhook Testing

Use ngrok or similar to expose local webhook:

```bash
ngrok http 80
```

Configure MoonPay dashboard with webhook URL:
`https://your-ngrok-url.ngrok.io/api/moonpay/webhook`

Test webhook with curl:

```bash
curl -X POST https://fvcdigital.com/api/moonpay/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "transaction_updated",
    "data": {
      "id": "test_123",
      "status": "completed",
      "walletAddress": "0x1234...",
      "currency": {"code": "usdc_ethereum"},
      "quoteCurrencyAmount": "100",
      "baseCurrencyAmount": "100",
      "baseCurrency": {"code": "usd"}
    }
  }'
```

## Production Checklist

- [ ] Replace sandbox API key with production key
- [ ] Configure MOONPAY_SECRET_KEY for URL signing
- [ ] Configure MOONPAY_WEBHOOK_KEY for webhook verification
- [ ] Set MOONPAY_ENVIRONMENT=production
- [ ] Register webhook URL in MoonPay dashboard
- [ ] Test with small real purchase
- [ ] Monitor logs for webhook deliveries

## Troubleshooting

### Widget not opening
- Check browser console for errors
- Verify API key is configured
- Ensure wallet is connected

### Webhook not receiving
- Check ngrok/tunnel status
- Verify webhook URL in MoonPay dashboard
- Check server logs: `tail -f storage/logs/laravel.log`

### URL signing errors (production)
- Verify MOONPAY_SECRET_KEY is set
- Check signature format in logs

## Support

MoonPay Dashboard: https://dashboard.moonpay.com
MoonPay Docs: https://docs.moonpay.com
