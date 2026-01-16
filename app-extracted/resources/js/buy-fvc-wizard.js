class FVCBuyWizard {
    constructor(containerId, wizardConfig) {
        this.container = document.getElementById(containerId);
        this.config = wizardConfig;
        this.currentStep = 1;
        this.walletAddress = null;
        this.paymentMethod = null;
        this.provider = null;
        this.signer = null;
        this.saleContract = null;
        
        if (this.container) {
            this.init();
        }
    }

    async init() {
        await this.checkWalletConnection();
        this.render();
        
        // Watch for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnectWallet();
                } else {
                    window.location.reload();
                }
            });
            
            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });
        }
    }

    async checkWalletConnection() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    this.walletAddress = accounts[0];
                    await this.setupProvider();
                }
            } catch (error) {
                console.error('Error checking wallet:', error);
            }
        }
    }

    async connectWallet() {
        try {
            if (typeof window.ethereum === 'undefined') {
                this.showWalletOptions();
                return;
            }

            this.showConnectingState();

            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            if (accounts.length > 0) {
                this.walletAddress = accounts[0];
                await this.setupProvider();
                
                // Check if on correct network
                const network = await this.provider.getNetwork();
                if (network.chainId !== this.config.chainId) {
                    await this.switchToNetwork();
                }

                this.completeStep(1);
                this.goToStep(2);
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            if (error.code === 4001) {
                alert('Connection rejected. Please try again.');
            } else {
                alert('Failed to connect wallet. Please try again.');
            }
            this.render();
        }
    }

    async setupProvider() {
        if (window.ethereum) {
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();

            // Initialize Sale contract
            if (this.config.saleContractAddress && 
                this.config.saleContractAddress !== '0x0000000000000000000000000000000000000000') {
                this.saleContract = new ethers.Contract(
                    this.config.saleContractAddress,
                    this.getSaleContractABI(),
                    this.signer
                );
            }
        }
    }

    showConnectingState() {
        this.container.innerHTML = `
            <div class="card p-5 text-center">
                <div class="spinner-border text-warning mb-3" role="status">
                    <span class="visually-hidden">Connecting...</span>
                </div>
                <h4 class="mb-3">Connecting Wallet...</h4>
                <p class="text-muted">Please check your wallet extension</p>
            </div>
        `;
    }

    showWalletOptions() {
        this.container.innerHTML = `
            <div class="card p-5">
                <h3 class="text-center mb-4">No Web3 Wallet Detected</h3>
                <p class="text-center text-muted mb-4">Please install a Web3 wallet to continue</p>
                
                <div class="row g-3">
                    <div class="col-md-4">
                        <a href="https://metamask.io/download/" target="_blank" class="text-decoration-none">
                            <div class="card h-100 text-center p-4 wallet-option">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
                                     alt="MetaMask" style="height: 60px; margin: 0 auto;" class="mb-3">
                                <h5>MetaMask</h5>
                                <p class="text-muted small">Most popular wallet</p>
                            </div>
                        </a>
                    </div>
                    <div class="col-md-4">
                        <a href="https://www.coinbase.com/wallet" target="_blank" class="text-decoration-none">
                            <div class="card h-100 text-center p-4 wallet-option">
                                <img src="https://www.coinbase.com/assets/wallet-logo.png" 
                                     alt="Coinbase Wallet" style="height: 60px; margin: 0 auto;" class="mb-3">
                                <h5>Coinbase Wallet</h5>
                                <p class="text-muted small">User-friendly</p>
                            </div>
                        </a>
                    </div>
                    <div class="col-md-4">
                        <a href="https://trustwallet.com/" target="_blank" class="text-decoration-none">
                            <div class="card h-100 text-center p-4 wallet-option">
                                <img src="https://trustwallet.com/assets/images/media/assets/TWT.png" 
                                     alt="Trust Wallet" style="height: 60px; margin: 0 auto;" class="mb-3">
                                <h5>Trust Wallet</h5>
                                <p class="text-muted small">Mobile & Desktop</p>
                            </div>
                        </a>
                    </div>
                </div>
                
                <div class="text-center mt-4">
                    <button class="btn btn-outline-secondary" onclick="buyWizard.render()">
                        <i class="bi bi-arrow-left"></i> Back
                    </button>
                </div>
            </div>
            <style>
                .wallet-option {
                    transition: all 0.3s;
                    cursor: pointer;
                }
                .wallet-option:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
            </style>
        `;
    }

    async disconnectWallet() {
        this.walletAddress = null;
        this.provider = null;
        this.signer = null;
        this.saleContract = null;
        this.currentStep = 1;
        this.render();
    }

    async switchToNetwork() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${this.config.chainId.toString(16)}` }],
            });
        } catch (error) {
            if (error.code === 4902) {
                // Network not added, add BSC
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: `0x${this.config.chainId.toString(16)}`,
                        chainName: 'Binance Smart Chain',
                        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                        rpcUrls: ['https://bsc-dataseed.binance.org/'],
                        blockExplorerUrls: ['https://bscscan.com/']
                    }]
                });
            } else {
                console.error('Error switching network:', error);
                alert('Please switch to Binance Smart Chain in your wallet');
                throw error;
            }
        }
    }

    getSaleContractABI() {
        return [
            'function buy(address stable, uint256 amount) external',
            'function rate() external view returns (uint256)',
            'function cap() external view returns (uint256)',
            'function raised() external view returns (uint256)',
            'function active() external view returns (bool)',
            'function isAccepted(address) external view returns (bool)'
        ];
    }
    
    getERC20ABI() {
        return [
            'function approve(address spender, uint256 amount) external returns (bool)',
            'function allowance(address owner, address spender) external view returns (uint256)',
            'function balanceOf(address account) external view returns (uint256)',
            'function decimals() external view returns (uint8)'
        ];
    }

    completeStep(step) {
        const indicator = document.getElementById(`step-indicator-${step}`);
        if (indicator) {
            const circle = indicator.querySelector('.step-circle');
            circle.classList.remove('active');
            circle.classList.add('completed');
            circle.innerHTML = '<i class="bi bi-check"></i>';
        }
    }

    goToStep(step) {
        // Update active indicator
        for (let i = 1; i <= 4; i++) {
            const indicator = document.getElementById(`step-indicator-${i}`);
            if (indicator) {
                const circle = indicator.querySelector('.step-circle');
                if (i === step && !circle.classList.contains('completed')) {
                    circle.classList.add('active');
                } else if (i !== step && !circle.classList.contains('completed')) {
                    circle.classList.remove('active');
                }
            }
        }
        
        this.currentStep = step;
        this.render();
    }

    async initiateMoonPayPurchase() {
        try {
            const response = await fetch(`${this.config.apiBase}/moonpay/sign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: this.walletAddress,
                    currencyCode: 'usdc_bsc'
                })
            });
            
            const data = await response.json();
            
            if (data.url) {
                // Open MoonPay widget in popup
                const width = 500;
                const height = 700;
                const left = (screen.width / 2) - (width / 2);
                const top = (screen.height / 2) - (height / 2);
                
                const popup = window.open(
                    data.url,
                    'MoonPay',
                    `width=${width},height=${height},left=${left},top=${top}`
                );
                
                // Poll for completion
                this.pollMoonPayStatus(popup);
            } else {
                alert('Failed to initialize MoonPay. Please try again.');
            }
        } catch (error) {
            console.error('Error initiating MoonPay:', error);
            alert('Failed to process card payment. Please try again.');
        }
    }

    pollMoonPayStatus(popup) {
        const interval = setInterval(() => {
            if (popup.closed) {
                clearInterval(interval);
                // Check if payment was successful
                this.checkMoonPayCompletion();
            }
        }, 1000);
    }

    async checkMoonPayCompletion() {
        // In production, check via webhook/API
        const userConfirmed = confirm('Did you complete the MoonPay purchase?');
        if (userConfirmed) {
            this.completeStep(3);
            this.goToStep(4);
        }
    }

    async buyWithCrypto(stableToken, amount) {
        try {
            if (!this.saleContract) {
                alert('Sale contract not initialized. Please reconnect wallet.');
                return;
            }

            const tokenAddress = stableToken === 'USDC' ? this.config.usdcAddress : this.config.usdtAddress;
            
            if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
                alert(`${stableToken} not configured on this network.`);
                return;
            }

            // Create token contract instance
            const tokenContract = new ethers.Contract(
                tokenAddress,
                this.getERC20ABI(),
                this.signer
            );
            
            // Get token decimals (USDC/USDT typically 6 decimals)
            const decimals = await tokenContract.decimals();
            const amountParsed = ethers.utils.parseUnits(amount.toString(), decimals);
            
            this.updateStatus('Checking balance...');
            
            // Check user balance
            const balance = await tokenContract.balanceOf(this.walletAddress);
            if (balance.lt(amountParsed)) {
                alert(`Insufficient ${stableToken} balance. You have ${ethers.utils.formatUnits(balance, decimals)} ${stableToken}`);
                return;
            }
            
            // Check current allowance
            const currentAllowance = await tokenContract.allowance(this.walletAddress, this.config.saleContractAddress);
            
            // If allowance is insufficient, request approval
            if (currentAllowance.lt(amountParsed)) {
                this.updateStatus(`Approving ${stableToken} spend...`);
                console.log(`Requesting approval for ${ethers.utils.formatUnits(amountParsed, decimals)} ${stableToken}`);
                
                const approveTx = await tokenContract.approve(this.config.saleContractAddress, amountParsed);
                this.updateStatus('Waiting for approval confirmation...');
                await approveTx.wait();
                console.log('Approval confirmed');
            }
            
            // Execute purchase
            this.updateStatus(`Purchasing FVC with ${stableToken}...`);
            console.log(`Calling buy(${tokenAddress}, ${amountParsed.toString()})`);
            
            const buyTx = await this.saleContract.buy(tokenAddress, amountParsed);
            this.updateStatus('Waiting for purchase confirmation...');
            const receipt = await buyTx.wait();
            
            console.log('Purchase confirmed:', receipt.transactionHash);
            
            // Record purchase in backend
            await this.recordPurchase({
                txHash: receipt.transactionHash,
                wallet: this.walletAddress,
                paymentMethod: 'crypto',
                stableToken: stableToken,
                amount: amount,
                tokenAddress: tokenAddress
            });
            
            this.completeStep(3);
            this.goToStep(4);
        } catch (error) {
            console.error('Error purchasing with crypto:', error);
            
            let errorMessage = 'Purchase failed. ';
            if (error.code === 4001) {
                errorMessage += 'Transaction rejected by user.';
            } else if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Please try again.';
            }
            
            alert(errorMessage);
            this.updateStatus('');
        }
    }
    
    async recordPurchase(data) {
        try {
            await fetch(`${this.config.apiBase}/purchases`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content
                },
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.error('Failed to record purchase:', error);
            // Don't block the flow if backend recording fails
        }
    }

    updateStatus(message) {
        const statusEl = document.getElementById('transaction-status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    render() {
        switch (this.currentStep) {
            case 1:
                this.renderStep1();
                break;
            case 2:
                this.renderStep2();
                break;
            case 3:
                this.renderStep3();
                break;
            case 4:
                this.renderStep4();
                break;
        }
    }

    renderStep1() {
        this.container.innerHTML = `
            <div class="card p-5 text-center">
                <i class="bi bi-wallet2 display-1 text-warning mb-3"></i>
                <h3 class="mb-3">Connect Your Wallet</h3>
                <p class="text-muted mb-4">Connect your Web3 wallet to continue with the purchase</p>
                
                ${this.walletAddress ? `
                    <div class="alert alert-success d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-check-circle-fill me-2"></i>
                            <span>
                                <strong>Connected:</strong> 
                                ${this.walletAddress.substring(0, 6)}...${this.walletAddress.substring(38)}
                            </span>
                        </div>
                        <button class="btn btn-sm btn-outline-danger" onclick="buyWizard.disconnectWallet()">
                            Disconnect
                        </button>
                    </div>
                    <button class="btn btn-warning btn-lg px-5 mt-3" onclick="buyWizard.goToStep(2)">
                        Continue to Payment <i class="bi bi-arrow-right"></i>
                    </button>
                ` : `
                    <button class="btn btn-warning btn-lg px-5 mb-3" onclick="buyWizard.connectWallet()">
                        <i class="bi bi-wallet2"></i> Connect Wallet
                    </button>
                    <div class="text-muted small">
                        <p class="mb-2"><strong>Supported Networks:</strong></p>
                        <span class="badge bg-warning text-dark me-2">Binance Smart Chain (BSC)</span>
                    </div>
                    <hr class="my-4">
                    <p class="text-muted small mb-2"><strong>Compatible Wallets:</strong></p>
                    <div class="d-flex justify-content-center gap-3 flex-wrap">
                        <span class="badge bg-light text-dark">MetaMask</span>
                        <span class="badge bg-light text-dark">Trust Wallet</span>
                        <span class="badge bg-light text-dark">Coinbase Wallet</span>
                        <span class="badge bg-light text-dark">WalletConnect</span>
                    </div>
                `}
            </div>
        `;
    }

    renderStep2() {
        this.container.innerHTML = `
            <div class="card p-5">
                <h3 class="text-center mb-4">Choose Payment Method</h3>
                <div class="row g-4">
                    <div class="col-md-6">
                        <div class="card h-100 payment-option" onclick="buyWizard.selectPayment('card')">
                            <div class="card-body text-center p-4">
                                <i class="bi bi-credit-card display-3 text-primary mb-3"></i>
                                <h4>Credit/Debit Card</h4>
                                <p class="text-muted">Powered by MoonPay</p>
                                <span class="badge bg-success mb-3">Available Now</span>
                                <ul class="text-start">
                                    <li>Instant purchase</li>
                                    <li>KYC handled by MoonPay</li>
                                    <li>Supports major cards</li>
                                    <li>Fiat to crypto conversion</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card h-100 payment-option-disabled" style="opacity: 0.6; cursor: not-allowed;">
                            <div class="card-body text-center p-4">
                                <i class="bi bi-currency-bitcoin display-3 text-muted mb-3"></i>
                                <h4>USDC / USDT</h4>
                                <p class="text-muted">Direct blockchain purchase</p>
                                <span class="badge bg-warning text-dark mb-3">Coming Soon</span>
                                <ul class="text-start text-muted">
                                    <li>Lower fees</li>
                                    <li>Direct to contract</li>
                                    <li>Requires crypto wallet</li>
                                    <li>KYC: Ondato integration in progress</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                .payment-option {
                    cursor: pointer;
                    transition: all 0.3s;
                    border: 2px solid transparent;
                }
                .payment-option:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                    border-color: #0d6efd;
                }
            </style>
        `;
    }

    selectPayment(method) {
        this.paymentMethod = method;
        this.completeStep(2);
        this.goToStep(3);
    }

    renderStep3() {
        if (this.paymentMethod === 'card') {
            this.container.innerHTML = `
                <div class="card p-5 text-center">
                    <i class="bi bi-credit-card display-1 text-primary mb-3"></i>
                    <h3 class="mb-3">Purchase with Card</h3>
                    <p class="text-muted mb-4">You will be redirected to MoonPay to complete your purchase securely</p>
                    <div class="alert alert-info text-start">
                        <strong>What happens next:</strong>
                        <ol class="mb-0">
                            <li>MoonPay will handle KYC verification</li>
                            <li>Enter payment details</li>
                            <li>Complete purchase</li>
                            <li>FVC tokens sent to your wallet</li>
                        </ol>
                    </div>
                    <button class="btn btn-primary btn-lg px-5" onclick="buyWizard.initiateMoonPayPurchase()">
                        Continue to MoonPay
                    </button>
                    <button class="btn btn-outline-secondary mt-2" onclick="buyWizard.goToStep(2)">
                        Back
                    </button>
                </div>
            `;
        } else {
            this.container.innerHTML = `
                <div class="card p-5">
                    <h3 class="text-center mb-4">Purchase with USDC/USDT</h3>
                    <div class="alert alert-warning">
                        <strong>Note:</strong> Ondato KYC integration coming soon. Crypto purchases will require KYC verification.
                    </div>
                    <div class="mb-4">
                        <label class="form-label">Select Token</label>
                        <select class="form-select" id="stable-token">
                            <option value="USDC">USDC</option>
                            <option value="USDT">USDT</option>
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="form-label">Amount</label>
                        <input type="number" class="form-control" id="purchase-amount" placeholder="100" min="10" />
                        <small class="text-muted">Minimum: 10 USDC/USDT</small>
                    </div>
                    <div id="transaction-status" class="text-center text-muted mb-3"></div>
                    <button class="btn btn-warning btn-lg w-100" onclick="buyWizard.processCryptoPurchase()">
                        Purchase FVC Tokens
                    </button>
                    <button class="btn btn-outline-secondary w-100 mt-2" onclick="buyWizard.goToStep(2)">
                        Back
                    </button>
                </div>
            `;
        }
    }

    processCryptoPurchase() {
        const token = document.getElementById('stable-token').value;
        const amount = document.getElementById('purchase-amount').value;
        
        if (!amount || parseFloat(amount) < 10) {
            alert('Please enter an amount of at least 10');
            return;
        }
        
        this.buyWithCrypto(token, amount);
    }

    renderStep4() {
        this.container.innerHTML = `
            <div class="card p-5 text-center">
                <i class="bi bi-check-circle display-1 text-success mb-3"></i>
                <h3 class="mb-3">Purchase Complete!</h3>
                <p class="text-muted mb-4">Your FVC tokens have been sent to your wallet</p>
                <div class="alert alert-success text-start">
                    <strong>Transaction Details:</strong>
                    <ul class="mb-0">
                        <li>Wallet: ${this.walletAddress.substring(0, 6)}...${this.walletAddress.substring(38)}</li>
                        <li>Payment Method: ${this.paymentMethod === 'card' ? 'Credit/Debit Card (MoonPay)' : 'Crypto (USDC/USDT)'}</li>
                        <li>Network: Binance Smart Chain</li>
                    </ul>
                </div>
                <a href="/" class="btn btn-warning btn-lg px-5">Return to Home</a>
            </div>
        `;
    }
}

// Export the class to be initialized from blade template with proper config
window.FVCBuyWizard = FVCBuyWizard;
