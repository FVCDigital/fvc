<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'moonpay' => [
        'public_key' => env('MOONPAY_PUBLIC_KEY'),
        'secret_key' => env('MOONPAY_SECRET_KEY'),
        'webhook_secret' => env('MOONPAY_WEBHOOK_SECRET'),
    ],

    'bsc' => [
        'chain_id' => env('BSC_CHAIN_ID', 97),
        'rpc_url' => env('BSC_RPC_URL', 'https://data-seed-prebsc-1-s1.binance.org:8545'),
        'fvc_address' => env('BSC_FVC_ADDRESS'),
        'sale_address' => env('BSC_SALE_ADDRESS'),
        'vesting_address' => env('BSC_VESTING_ADDRESS'),
        'usdc_address' => env('BSC_USDC_ADDRESS'),
        'usdt_address' => env('BSC_USDT_ADDRESS'),
    ],

];
