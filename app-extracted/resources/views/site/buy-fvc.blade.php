<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Buy FVC Tokens - FVC Digital</title>
    <link rel="stylesheet" href="https://use.typekit.net/sxv2zkv.css">
    <link rel="stylesheet" href="{{ URL::asset('assets/css/bootstrap.css') }}"> 
    <link rel="stylesheet" href="{{ URL::asset('assets/css/app.css') }}"> 
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
</head>
<body class="bg">
    <div class="bkvideo"></div>
    <x-menu/>
    
    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-12 col-lg-10">
                <h1 class="text-center mb-2">Buy FVC Tokens</h1>
                <p class="text-center text-muted mb-5">Complete the steps below to participate in the FVC presale</p>
                
                <!-- Progress Steps -->
                <div class="row mb-5">
                    <div class="col">
                        <div class="d-flex justify-content-between position-relative">
                            <div class="progress-line"></div>
                            <div class="step-item" id="step-indicator-1">
                                <div class="step-circle active">1</div>
                                <div class="step-label">Connect Wallet</div>
                            </div>
                            <div class="step-item" id="step-indicator-2">
                                <div class="step-circle">2</div>
                                <div class="step-label">Choose Payment</div>
                            </div>
                            <div class="step-item" id="step-indicator-3">
                                <div class="step-circle">3</div>
                                <div class="step-label">Purchase</div>
                            </div>
                            <div class="step-item" id="step-indicator-4">
                                <div class="step-circle">4</div>
                                <div class="step-label">Confirmation</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step Content -->
                <div id="buy-fvc-wizard"></div>
            </div>
        </div>
    </div>

    <footer class="mt-5 bg-dark p-3 bg-opacity-50">
        <div class="container text-white">
            <div class="row">
                <div class="col-12 text-center">© 2026 FVC Coin. All rights reserved.</div>
            </div>
        </div>
    </footer>

    <style>
        .step-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            z-index: 2;
        }
        
        .step-circle {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #e9ecef;
            border: 3px solid #dee2e6;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 1.2rem;
            color: #6c757d;
            transition: all 0.3s;
        }
        
        .step-circle.active {
            background: #ffc107;
            border-color: #ffc107;
            color: #000;
        }
        
        .step-circle.completed {
            background: #28a745;
            border-color: #28a745;
            color: #fff;
        }
        
        .step-label {
            margin-top: 10px;
            font-size: 0.9rem;
            text-align: center;
        }
        
        .progress-line {
            position: absolute;
            top: 25px;
            left: 0;
            right: 0;
            height: 3px;
            background: #dee2e6;
            z-index: 1;
        }
    </style>

    <script src="{{ URL::asset('assets/js/bootstrap.bundle.min.js') }}"></script>
    <script src="https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js"></script>
    <script>
        // FVC Configuration - injected from Laravel
        window.fvcConfig = {
            apiBase: '{{ config('app.url') }}/api',
            chainId: {{ config('services.bsc.chain_id', 97) }},
            rpcUrl: '{{ config('services.bsc.rpc_url') }}',
            saleContractAddress: '{{ config('services.bsc.sale_address') }}',
            fvcAddress: '{{ config('services.bsc.fvc_address') }}',
            vestingAddress: '{{ config('services.bsc.vesting_address') }}',
            usdcAddress: '{{ config('services.bsc.usdc_address') }}',
            usdtAddress: '{{ config('services.bsc.usdt_address') }}',
        };

        // Initialize wizard after config is loaded
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof FVCBuyWizard !== 'undefined') {
                window.buyWizard = new FVCBuyWizard('buy-fvc-wizard', window.fvcConfig);
            }
        });
    </script>
    <script type="module" src="http://localhost:5173/@@vite/client"></script>
    <script type="module" src="http://localhost:5173/resources/js/app.js"></script>
</body>
</html>
