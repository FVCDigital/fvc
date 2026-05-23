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

## End-to-End Test: MoonPay to FVC Vesting

### Test Flow

```
User → MoonPay Widget → ETH to Wallet → Buy FVC → Vesting Contract
```

### Prerequisites
- Wallet connected on fvcdigital.com/buy-fvc
- MoonPay sandbox API key configured
- Sale contract active with ETH acceptance

### Test Steps

1. **Connect Wallet**
   - Go to fvcdigital.com/buy-fvc
   - Click "Connect Wallet"
   - Select your wallet from the modal
   - Verify wallet address shows in wizard

2. **Initiate Card Payment**
   - Click "Credit/Debit Card" payment option
   - Select "ETH" from currency modal
   - MoonPay widget opens

3. **Complete MoonPay Purchase (Sandbox)**
   - Test card: `4000 0209 5159 5032`
   - Any CVV, future expiry, any name
   - Complete KYC (sandbox auto-approves)
   - Confirm purchase

4. **Wait for ETH Delivery**
   - Sandbox: Instant
   - Production: 5-10 minutes
   - Check wallet balance for ETH

5. **Purchase FVC with ETH**
   - Return to buy-fvc wizard
   - Select "ETH" payment method
   - Enter amount (e.g., 0.01 ETH)
   - Click "Buy FVC"
   - Approve transaction in wallet

6. **Verify Vesting Position**
   - Transaction confirms
   - Check vesting contract for new schedule
   - Etherscan: View tx on block explorer
   - Vesting position shows correct:
     - Beneficiary: Your wallet
     - Amount: FVC tokens
     - Cliff: 365 days
     - Duration: 730 days

### Expected Results

| Step | Expected Outcome |
|------|------------------|
| MoonPay widget | Opens with ETH locked, wallet pre-filled |
| Card payment | Completes, shows success |
| ETH delivery | Balance increases in wallet |
| FVC purchase | Transaction succeeds |
| Vesting | Schedule created with correct terms |

### Regional Restrictions

If USDC/USDT shows "not available in your region":
- Select ETH instead
- ETH has broader availability
- Note shown in currency selection modal

### Contract Addresses (Mainnet)

- Sale Contract: `0xdf95824ae269c62427a5925231b970aa43d709d1`
- Vesting Contract: Check Sale.vestingContract()
- FVC Token: `0xaFd47CAb6bDDf962328CE344545Ac35142805Ee1`

### Contract Addresses (Sepolia Testnet)

- Sale Contract: `0x60156C3290A98BD8025Bf17772dA0f338852b69E`
- Vesting Contract: `0xA85473C6310D751CBaA878C3C96E8971dE2bC0eb`
- FVC Token: `0xaFd47CAb6bDDf962328CE344545Ac35142805Ee1`

## Support

MoonPay Dashboard: https://dashboard.moonpay.com
MoonPay Docs: https://docs.moonpay.com
