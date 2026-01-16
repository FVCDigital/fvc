<?php

use Illuminate\Support\Facades\Route;

// Wallet connection
Route::post('/wallet/connect', function () {
    return response()->json(['success' => true]);
});

// Sale info
Route::get('/sale/price', function () {
    return response()->json([
        'pricePerToken' => 0.10, // $0.10 per FVC
        'currency' => 'USD'
    ]);
});

Route::get('/sale/stats', function () {
    return response()->json([
        'totalRaised' => 50000,
        'totalSupply' => 1000000,
        'tokensSold' => 500000,
        'participantsCount' => 150
    ]);
});

// KYC endpoints (mock for now)
Route::get('/kyc/status/{wallet}', function ($wallet) {
    return response()->json([
        'verified' => false,
        'wallet' => $wallet,
        'status' => 'pending'
    ]);
});

Route::post('/kyc/verify', function () {
    return response()->json([
        'success' => true,
        'verification_url' => 'https://ondato.com/verify?session=mock123',
        'session_id' => 'mock123'
    ]);
});

// MoonPay integration (mock for now)
Route::post('/moonpay/sign', function () {
    $walletAddress = request()->input('walletAddress');
    
    // In production, you would sign this URL with your MoonPay secret key
    $mockUrl = "https://buy.moonpay.com/?apiKey=YOUR_MOONPAY_KEY&walletAddress={$walletAddress}&currencyCode=usdc";
    
    return response()->json([
        'url' => $mockUrl
    ]);
});

Route::post('/moonpay/webhook', function () {
    // Handle MoonPay webhook
    return response()->json(['success' => true]);
});

// Purchase tracking
Route::post('/purchases', function () {
    try {
        $data = request()->validate([
            'txHash' => 'nullable|string|max:66',
            'wallet' => 'required|string|max:42',
            'paymentMethod' => 'required|in:card,crypto',
            'stableToken' => 'nullable|string',
            'amount' => 'required|numeric|min:0',
            'tokenAddress' => 'nullable|string|max:42',
        ]);

        $purchase = \App\Models\Purchase::recordCrypto([
            'wallet' => $data['wallet'],
            'txHash' => $data['txHash'] ?? null,
            'stableToken' => $data['stableToken'] ?? null,
            'amount' => $data['amount'],
            'tokenAddress' => $data['tokenAddress'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'purchase_id' => $purchase->id,
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
        ], 400);
    }
});

Route::get('/purchases/{wallet}', function ($wallet) {
    try {
        $purchases = \App\Models\Purchase::getByWallet($wallet);
        
        return response()->json([
            'success' => true,
            'purchases' => $purchases,
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
        ], 400);
    }
});
