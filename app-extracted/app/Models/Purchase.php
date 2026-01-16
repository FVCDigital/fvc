<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Purchase extends Model
{
    protected $fillable = [
        'wallet_address',
        'tx_hash',
        'payment_method',
        'stable_token',
        'token_address',
        'amount',
        'fvc_amount',
        'status',
        'moonpay_transaction_id',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:6',
        'fvc_amount' => 'decimal:18',
        'metadata' => 'array',
    ];

    /**
     * Get purchases by wallet address
     */
    public static function getByWallet(string $walletAddress)
    {
        return static::where('wallet_address', strtolower($walletAddress))
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Record a crypto purchase
     */
    public static function recordCrypto(array $data): self
    {
        return static::create([
            'wallet_address' => strtolower($data['wallet']),
            'tx_hash' => $data['txHash'],
            'payment_method' => 'crypto',
            'stable_token' => $data['stableToken'],
            'token_address' => strtolower($data['tokenAddress']),
            'amount' => $data['amount'],
            'status' => 'confirmed', // Crypto purchases are instant
            'metadata' => $data['metadata'] ?? null,
        ]);
    }

    /**
     * Record a MoonPay purchase
     */
    public static function recordMoonPay(array $data): self
    {
        return static::create([
            'wallet_address' => strtolower($data['wallet']),
            'payment_method' => 'card',
            'amount' => $data['amount'],
            'moonpay_transaction_id' => $data['transactionId'],
            'status' => $data['status'] ?? 'pending',
            'metadata' => $data['metadata'] ?? null,
        ]);
    }
}
