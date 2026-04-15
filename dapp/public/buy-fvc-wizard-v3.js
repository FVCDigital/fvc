class FVCBuyWizard {
    constructor(containerId, wizardConfig) {
        this.container = document.getElementById(containerId);
        this.config = wizardConfig;
        this.config.chainId = Number(this.config.chainId);
        this.currentStep = 1;
        this.completedSteps = new Set();
        this.walletAddress = null;
        this.paymentMethod = null;
        this.provider = null;
        this.signer = null;
        this.saleContract = null;
        this.lastTxHash = null;
        this._walletBalance = null;
        this._balanceDecimals = null;
        this._eth = null;
        this._rpcProvider = null;
        this._cachedFvcRate = 0.03;
        this._cachedEthUsd = 2000;
        this._ratesReady = false;
        
        // Investor allowlist terms
        this._investorTerms = null;
        this._isAllowlisted = false;

        if (this.container) this.init();
    }

    _getRpcProvider() {
        if (!this._rpcProvider && this.config.rpcUrl) {
            this._rpcProvider = new ethers.providers.JsonRpcProvider(this.config.rpcUrl);
        }
        return this._rpcProvider;
    }

    getEthereumProvider() {
        if (this._eth) return this._eth;
        if (window.ethereum) {
            if (window.ethereum.providers && window.ethereum.providers.length) {
                const mm = window.ethereum.providers.find(p => p.isMetaMask && !p.isBraveWallet);
                if (mm) { this._eth = mm; return this._eth; }
            }
            this._eth = window.ethereum;
            return this._eth;
        }
        if (window.web3 && window.web3.currentProvider) { this._eth = window.web3.currentProvider; return this._eth; }
        return null;
    }

    async init() {
        const eth = this.getEthereumProvider();
        if (eth) {
            try {
                const accounts = await eth.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    this._setupProvider(eth, accounts[0]);
                }
            } catch (e) {
                console.warn('Wallet init error:', e);
            }

            try {
                eth.on('accountsChanged', (accs) => {
                    if (!accs || accs.length === 0) {
                        this._clearWallet();
                    } else {
                        this._setupProvider(eth, accs[0]);
                    }
                    this.render();
                });

                eth.on('chainChanged', () => {
                    if (this.walletAddress) {
                        this._setupProvider(eth, this.walletAddress);
                    }
                    this.render();
                });
            } catch (e) {
                console.warn('Wallet event listener error:', e);
            }
        }
        this.render();
        this._updateStepClickability();
        try {
            this._prefetchRates();
        } catch (e) {
            console.warn('Rate prefetch error:', e);
        }
    }

    _setupProvider(eth, address) {
        this._eth = eth;
        this.walletAddress = address;
        this.provider = new ethers.providers.Web3Provider(eth, 'any');
        this.signer = this.provider.getSigner();
        this._initSaleContract();
        this._fetchInvestorTerms();
    }

    _clearWallet() {
        this.walletAddress = null;
        this.provider = null;
        this.signer = null;
        this.saleContract = null;
        this.currentStep = 1;
    }

    _initSaleContract() {
        if (this.signer && this.config.saleContractAddress) {
            this.saleContract = new ethers.Contract(
                this.config.saleContractAddress,
                this.getSaleContractABI(),
                this.signer
            );
        }
    }

    async _fetchInvestorTerms() {
        if (!this.walletAddress || !this.config.saleContractAddress) return;
        
        try {
            const rpc = this._getRpcProvider();
            const sale = new ethers.Contract(
                this.config.saleContractAddress,
                this.getSaleContractABI(),
                rpc
            );
            
            const terms = await sale.getInvestorTerms(this.walletAddress);
            
            if (terms.active) {
                this._isAllowlisted = true;
                this._investorTerms = {
                    maxAmount: Number(terms.maxAmount) / 1e6,
                    spent: Number(terms.spent) / 1e6,
                    remaining: Number(terms.remaining) / 1e6,
                    customRate: Number(terms.customRate) / 1e6,
                    cliffDays: Number(terms.cliff) / 86400,
                    durationDays: Number(terms.duration) / 86400,
                };
                
                // Use custom rate if set
                if (this._investorTerms.customRate > 0) {
                    this._cachedFvcRate = this._investorTerms.customRate;
                }
                
                console.log('Investor allowlisted:', this._investorTerms);
            } else {
                this._isAllowlisted = false;
                this._investorTerms = null;
            }
        } catch (e) {
            console.warn('Could not fetch investor terms:', e);
            this._isAllowlisted = false;
            this._investorTerms = null;
        }
    }

    async connectWallet() {
        const eth = this.getEthereumProvider();
        if (!eth) {
            this.showWalletOptions();
            return;
        }

        this.showConnectingState();

        try {
            const accounts = await eth.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) {
                alert('No accounts returned. Unlock your wallet and try again.');
                this.render();
                return;
            }

            this._setupProvider(eth, accounts[0]);

            const network = await this.provider.getNetwork();
            this._connectedChainId = Number(network.chainId);
            if (Number(network.chainId) !== this.config.chainId) {
                try {
                    await eth.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x' + this.config.chainId.toString(16) }],
                    });
                    this._setupProvider(eth, accounts[0]);
                    this._connectedChainId = this.config.chainId;
                } catch (switchErr) {
                    if (switchErr.code === 4902) {
                        try {
                            await eth.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: '0x' + this.config.chainId.toString(16),
                                    chainName: this.getNetworkName(),
                                    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                                    rpcUrls: [this.config.rpcUrl],
                                    blockExplorerUrls: [this.config.chainId === 1 ? 'https://etherscan.io/' : 'https://sepolia.etherscan.io/']
                                }]
                            });
                            this._setupProvider(eth, accounts[0]);
                        } catch (addErr) {}
                    }
                }
            }

            this.completeStep(1);
            this.goToStep(2);
        } catch (error) {
            if (error.code === 4001) {
                alert('Connection rejected.');
            } else {
                this._handleWalletError(error);
            }
            this.render();
        }
    }

    showConnectingState() {
        this.container.innerHTML = `
            <div class="card p-5 text-center">
                <div class="spinner-border text-warning mb-3" role="status"></div>
                <h4 class="mb-3">Connecting Wallet...</h4>
                <p class="text-muted">Check your wallet extension</p>
            </div>
        `;
    }

    showWalletOptions() {
        this.container.innerHTML = `
            <div class="card p-5">
                <h3 class="text-center mb-4">No Web3 Wallet Detected</h3>
                <p class="text-center text-muted mb-4">Install a Web3 wallet to continue</p>
                <div class="row g-3">
                    <div class="col-md-4">
                        <a href="https://metamask.io/download/" target="_blank" class="text-decoration-none">
                            <div class="card h-100 text-center p-4 wallet-option">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" style="height:60px;margin:0 auto" class="mb-3">
                                <h5>MetaMask</h5>
                                <p class="text-muted small">Most popular</p>
                            </div>
                        </a>
                    </div>
                    <div class="col-md-4">
                        <a href="https://www.coinbase.com/wallet" target="_blank" class="text-decoration-none">
                            <div class="card h-100 text-center p-4 wallet-option">
                                <img src="https://www.coinbase.com/assets/wallet-logo.png" alt="Coinbase" style="height:60px;margin:0 auto" class="mb-3">
                                <h5>Coinbase Wallet</h5>
                                <p class="text-muted small">User-friendly</p>
                            </div>
                        </a>
                    </div>
                    <div class="col-md-4">
                        <a href="https://trustwallet.com/" target="_blank" class="text-decoration-none">
                            <div class="card h-100 text-center p-4 wallet-option">
                                <img src="https://trustwallet.com/assets/images/media/assets/TWT.png" alt="Trust" style="height:60px;margin:0 auto" class="mb-3">
                                <h5>Trust Wallet</h5>
                                <p class="text-muted small">Mobile & Desktop</p>
                            </div>
                        </a>
                    </div>
                </div>
                <div class="text-center mt-4">
                    <button class="btn btn-outline-secondary" onclick="buyWizard.render()"><i class="bi bi-arrow-left"></i> Back</button>
                </div>
            </div>
            <style>.wallet-option{transition:all .3s;cursor:pointer}.wallet-option:hover{transform:translateY(-5px);box-shadow:0 4px 12px rgba(0,0,0,.15)}</style>
        `;
    }

    async disconnectWallet() {
        const eth = this._eth;
        if (eth) {
            try {
                await eth.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] });
            } catch (e) {}
        }
        this._eth = null;
        this._connectedChainId = null;
        this._removeTestnetBanner();
        this._clearWallet();
        this.render();
    }

    getNetworkName() {
        const id = this.config.chainId;
        if (id === 11155111) return 'Ethereum Sepolia';
        if (id === 1) return 'Ethereum Mainnet';
        return 'Network ' + id;
    }

    _injectTestnetBanner() {
        if (!this._connectedChainId) return;
        if (this._connectedChainId === 1) return;
        const existing = document.getElementById('fvc-testnet-banner');
        if (existing) return;
        const banner = document.createElement('div');
        banner.id = 'fvc-testnet-banner';
        banner.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'width:100%', 'z-index:99999',
            'background:#ff3b30', 'color:#fff', 'text-align:center',
            'padding:14px 20px', 'font-size:1.25rem', 'font-weight:700',
            'letter-spacing:0.08em', 'pointer-events:none',
        ].join(';');
        const netName = this._connectedChainId === 11155111 ? 'SEPOLIA' : 'TESTNET (chain ' + this._connectedChainId + ')';
        banner.textContent = '⚠ ' + netName + ' — THIS IS A TEST NETWORK. DO NOT SEND REAL FUNDS.';
        document.body.prepend(banner);
        // Push page content down so banner doesn't overlap
        document.body.style.paddingTop = '54px';
    }

    _removeTestnetBanner() {
        const b = document.getElementById('fvc-testnet-banner');
        if (b) { b.remove(); document.body.style.paddingTop = ''; }
    }

    getExplorerUrl(txHash) {
        const id = this.config.chainId;
        if (id === 11155111) return 'https://sepolia.etherscan.io/tx/' + txHash;
        if (id === 1) return 'https://etherscan.io/tx/' + txHash;
        return '#';
    }

    getSaleContractABI() {
        return [
            'function buy(address stable, uint256 amount) external',
            'function buyWithETH() external payable',
            'function rate() external view returns (uint256)',
            'function cap() external view returns (uint256)',
            'function raised() external view returns (uint256)',
            'function active() external view returns (bool)',
            'function isAccepted(address) external view returns (bool)',
            'function ethUsdRate() external view returns (uint256)',
            'function getEffectiveEthUsdPrice() external view returns (uint256)',
            'function getInvestorTerms(address investor) external view returns (bool active, uint256 maxAmount, uint256 spent, uint256 remaining, uint256 customRate, uint256 cliff, uint256 duration)',
            'event TokensPurchased(address indexed buyer, address indexed token, uint256 stableAmount, uint256 fvcAmount)',
            'event TokensPurchasedWithVesting(address indexed buyer, uint256 fvcAmount, uint256 cliff, uint256 duration)',
            'event TokensPurchasedWithETH(address indexed buyer, uint256 ethAmount, uint256 usdEquivalent, uint256 fvcAmount)',
        ];
    }

    _parseFvcAmount(receipt) {
        try {
            const iface = new ethers.utils.Interface(this.getSaleContractABI());
            for (const log of receipt.logs) {
                try {
                    const parsed = iface.parseLog(log);
                    if (parsed && (
                        parsed.name === 'TokensPurchased' ||
                        parsed.name === 'TokensPurchasedWithVesting' ||
                        parsed.name === 'TokensPurchasedWithETH'
                    )) {
                        return parsed.args.fvcAmount;
                    }
                } catch (e) {}
            }
        } catch (e) {}
        return null;
    }

    getERC20ABI() {
        return [
            'function approve(address spender, uint256 amount) external returns (bool)',
            'function allowance(address owner, address spender) external view returns (uint256)',
            'function balanceOf(address account) external view returns (uint256)',
            'function decimals() external view returns (uint8)'
        ];
    }

    async addFVCToWallet() {
        const eth = this.getEthereumProvider();
        if (!eth || !this.config.fvcAddress) return;
        try {
            await eth.request({
                method: 'wallet_watchAsset',
                params: { type: 'ERC20', options: { address: this.config.fvcAddress, symbol: 'FVC', decimals: 18, image: this.config.fvcLogoUrl } },
            });
        } catch (e) {}
    }

    completeStep(step) {
        this.completedSteps.add(step);
        const el = document.getElementById('step-indicator-' + step);
        if (el) {
            const c = el.querySelector('.step-circle');
            c.classList.remove('active');
            c.classList.add('completed');
            c.innerHTML = '<i class="bi bi-check"></i>';
        }
        this._updateStepClickability();
    }

    _updateStepClickability() {
        for (let i = 1; i <= 5; i++) {
            const el = document.getElementById('step-indicator-' + i);
            if (!el) continue;
            const isCompleted = this.completedSteps.has(i);
            // Step 5 is always clickable (jumpToVesting handles wallet check)
            const isClickable = isCompleted || i === 5;
            if (isClickable) {
                el.style.cursor = 'pointer';
                el.onclick = i === 5
                    ? () => buyWizard.jumpToVesting()
                    : () => buyWizard.goToStep(i);
            } else {
                el.style.cursor = 'default';
                el.onclick = null;
            }
        }
    }

    async jumpToVesting() {
        // If wallet already connected, go straight to step 5
        if (this.walletAddress) {
            this._completeAllStepsUpTo(5);
            this.goToStep(5);
            return;
        }
        // Otherwise connect wallet first, then land on step 5
        try {
            const eth = this.getEthereumProvider();
            if (!eth) { alert('Please install MetaMask or a Web3 wallet to view your vesting.'); return; }
            const accounts = await eth.request({ method: 'eth_requestAccounts' });
            if (accounts && accounts.length > 0) {
                this._setupProvider(eth, accounts[0]);
            }
        } catch (e) {
            this._handleWalletError(e);
            return;
        }
        this._completeAllStepsUpTo(5);
        this.goToStep(5);
    }

    _completeAllStepsUpTo(targetStep) {
        for (let i = 1; i < targetStep; i++) {
            this.completedSteps.add(i);
            const el = document.getElementById('step-indicator-' + i);
            if (el) {
                const c = el.querySelector('.step-circle');
                c.classList.remove('active');
                c.classList.add('completed');
                c.innerHTML = '<i class="bi bi-check"></i>';
            }
        }
    }

    _handleWalletError(e) {
        if (e && e.message && (e.message.includes('LOCK') || e.message.includes('Access denied') || e.message.includes('trouble starting'))) {
            alert('Your wallet extension seems to be having issues. This is a known issue with some browser/wallet combinations.\n\nPlease try:\n1. Restarting your browser\n2. Restarting the wallet extension\n3. Using a different browser (Chrome, Firefox)\n4. Disabling other wallet extensions');
        } else if (e && e.code === 4001) {
            // User rejected - silent
        } else if (e) {
            console.error('Wallet error:', e);
        }
    }

    goToStep(step) {
        for (let i = 1; i <= 5; i++) {
            const el = document.getElementById('step-indicator-' + i);
            if (!el) continue;
            const c = el.querySelector('.step-circle');
            if (i === step) {
                // Current step: make it active
                this.completedSteps.delete(i);
                c.classList.remove('completed', 'active');
                c.innerHTML = String(i);
                c.classList.add('active');
            } else if (i > step) {
                // Steps ahead of current: reset them completely
                this.completedSteps.delete(i);
                c.classList.remove('completed', 'active');
                c.innerHTML = String(i);
            } else if (i < step) {
                // Steps behind current: only glow if completed
                if (!this.completedSteps.has(i)) {
                    c.classList.remove('completed', 'active');
                    c.innerHTML = String(i);
                }
            }
        }
        this.currentStep = step;
        this.render();
        this._updateStepClickability();
    }

    updateStatus(msg) {
        const el = document.getElementById('transaction-status');
        if (el) el.textContent = msg;
    }

    async ensureConnected() {
        if (this.provider && this.walletAddress && this.signer && this.saleContract) return true;
        const eth = this.getEthereumProvider();
        if (!eth) {
            console.error('ensureConnected: no ethereum provider found');
            return false;
        }
        try {
            const accounts = await eth.request({ method: 'eth_requestAccounts' });
            if (accounts && accounts.length > 0) {
                this._setupProvider(eth, accounts[0]);
                if (!this.saleContract) {
                    console.error('ensureConnected: saleContract still null after setup. signer:', !!this.signer, 'saleAddr:', this.config.saleContractAddress);
                }
                return !!(this.saleContract);
            }
        } catch (e) {
            console.error('ensureConnected error:', e);
        }
        return false;
    }

    // ========== PURCHASE LOGIC ==========

    async buyWithCrypto(stableToken, amount) {
        if (!(await this.ensureConnected())) {
            alert('Wallet not connected. Go back to step 1.');
            return;
        }
        try {
            const isUSDT = stableToken === 'USDT';
            const tokenAddress = isUSDT ? this.config.usdtAddress : this.config.usdcAddress;
            if (!tokenAddress) { alert(stableToken + ' not configured.'); return; }

            const tokenContract = new ethers.Contract(tokenAddress, this.getERC20ABI(), this.signer);
            const decimals = await tokenContract.decimals();
            const amountParsed = ethers.utils.parseUnits(amount.toString(), decimals);

            this.updateStatus('Checking balance...');
            const balance = await tokenContract.balanceOf(this.walletAddress);
            if (balance.lt(amountParsed)) {
                alert('Insufficient ' + stableToken + '. You have ' + ethers.utils.formatUnits(balance, decimals));
                this.updateStatus(''); return;
            }

            const allowance = await tokenContract.allowance(this.walletAddress, this.config.saleContractAddress);
            if (allowance.lt(amountParsed)) {
                this.updateStatus('Approving ' + stableToken + '...');
                const tx = await tokenContract.approve(this.config.saleContractAddress, amountParsed);
                this.updateStatus('Waiting for approval...');
                await tx.wait();
            }

            this.updateStatus('Purchasing FVC...');
            const buyTx = await this.saleContract.buy(tokenAddress, amountParsed);
            this.updateStatus('Confirming...');
            const receipt = await buyTx.wait();
            this.lastTxHash = receipt.transactionHash;
            this.lastFvcAmount = this._parseFvcAmount(receipt);
            this.completeStep(3);
            this.goToStep(4);
        } catch (error) {
            alert(error.code === 4001 ? 'Transaction rejected.' : (error.reason || error.message || 'Purchase failed.'));
            this.updateStatus('');
        }
    }

    async buyWithETH(ethAmount) {
        if (!(await this.ensureConnected())) {
            alert('Wallet not connected. Go back to step 1.');
            return;
        }
        try {
            const amountParsed = ethers.utils.parseEther(ethAmount.toString());
            this.updateStatus('Purchasing FVC...');
            const buyTx = await this.saleContract.buyWithETH({ value: amountParsed });
            this.updateStatus('Confirming...');
            const receipt = await buyTx.wait();
            this.lastTxHash = receipt.transactionHash;
            this.lastFvcAmount = this._parseFvcAmount(receipt);
            this.completeStep(3);
            this.goToStep(4);
        } catch (error) {
            alert(error.code === 4001 ? 'Transaction rejected.' : (error.reason || error.message || 'Purchase failed.'));
            this.updateStatus('');
        }
    }

    // ========== BALANCE ==========

    async loadWalletBalance() {
        const balEl = document.getElementById('wallet-balance');
        if (!balEl) return;

        if (!this.walletAddress) {
            balEl.textContent = 'Wallet not connected';
            return;
        }

        try {
            const rpc = this._getRpcProvider();
            if (this.paymentMethod === 'eth') {
                const bal = await rpc.getBalance(this.walletAddress);
                balEl.textContent = 'Balance: ' + parseFloat(ethers.utils.formatEther(bal)).toFixed(4) + ' ETH';
                this._walletBalance = bal;
                this._balanceDecimals = 18;
            } else if (this.paymentMethod === 'usdt') {
                const tc = new ethers.Contract(this.config.usdtAddress, this.getERC20ABI(), rpc);
                const [dec, bal] = await Promise.all([tc.decimals(), tc.balanceOf(this.walletAddress)]);
                balEl.textContent = 'Balance: ' + parseFloat(ethers.utils.formatUnits(bal, dec)).toFixed(2) + ' USDT';
                this._walletBalance = bal;
                this._balanceDecimals = dec;
            } else {
                const tc = new ethers.Contract(this.config.usdcAddress, this.getERC20ABI(), rpc);
                const [dec, bal] = await Promise.all([tc.decimals(), tc.balanceOf(this.walletAddress)]);
                balEl.textContent = 'Balance: ' + parseFloat(ethers.utils.formatUnits(bal, dec)).toFixed(2) + ' USDC';
                this._walletBalance = bal;
                this._balanceDecimals = dec;
            }
        } catch (e) {
            balEl.textContent = 'Balance: --';
        }
    }

    setPercentage(pct) {
        if (!this._walletBalance) return;
        const el = document.getElementById('purchase-amount');
        if (!el) return;
        const raw = this._walletBalance.mul(pct).div(100);
        el.value = this.paymentMethod === 'eth'
            ? ethers.utils.formatEther(raw)
            : ethers.utils.formatUnits(raw, this._balanceDecimals);
        el.dispatchEvent(new Event('input'));
    }

    // ========== ESTIMATES (synchronous from cached rates) ==========

    async _prefetchRates() {
        // Seed a reasonable ETH/USD immediately so the UI is never blocked
        if (!this._cachedEthUsd) this._cachedEthUsd = 2000;

        // Fetch ETH price from CoinGecko (fast, no auth) and contract rate in parallel
        const cgFetch = fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
            .then(r => r.json())
            .then(d => d.ethereum.usd)
            .catch(() => null);

        const rpc = this._getRpcProvider();
        const sale = new ethers.Contract(this.config.saleContractAddress, this.getSaleContractABI(), rpc);
        const contractFetch = Promise.all([sale.rate(), sale.getEffectiveEthUsdPrice()])
            .then(([rate, ethUsd]) => ({ rate: Number(rate) / 1e6, ethUsd: Number(ethUsd) / 1e6 }))
            .catch(() => null);

        // Use whichever resolves first to update the UI
        const cgPrice = await Promise.race([
            cgFetch,
            new Promise(r => setTimeout(() => r(null), 3000))
        ]);
        if (cgPrice) {
            this._cachedEthUsd = cgPrice;
            this._ratesReady = true;
            this._updateRateUI();
        }

        // Then apply contract values when they arrive (authoritative)
        contractFetch.then(result => {
            if (!result) return;
            this._cachedFvcRate = result.rate;
            this._cachedEthUsd = result.ethUsd;
            this._ratesReady = true;
            this._updateRateUI();
        });
    }

    _updateRateUI() {
        const rateInfoEl = document.getElementById('eth-rate-info');
        if (rateInfoEl && this._cachedEthUsd) {
            rateInfoEl.textContent = '1 ETH \u2248 $' + this._cachedEthUsd.toFixed(2) + ' | 1 FVC = $' + this._cachedFvcRate.toFixed(4);
        }
        // Re-run whichever estimate is active so displayed values stay current
        if (document.getElementById('purchase-amount-usd')) {
            const usdEl = document.getElementById('purchase-amount-usd');
            if (usdEl && usdEl.value) this._syncEthFromUsd(parseFloat(usdEl.value) || 0);
        } else {
            this.updateETHEstimate();
        }
    }

    updateETHEstimate() {
        const amountEl = document.getElementById('purchase-amount');
        const estimateEl = document.getElementById('fvc-estimate');
        if (!amountEl || !estimateEl) return;
        const amount = parseFloat(amountEl.value);
        if (!amount || amount <= 0) {
            estimateEl.textContent = '0';
            const usdEl = document.getElementById('purchase-amount-usd');
            if (usdEl) usdEl.value = '';
            return;
        }
        if (!this._cachedEthUsd) { estimateEl.textContent = '...'; return; }
        const usdValue = amount * this._cachedEthUsd;
        const fvcAmount = usdValue / this._cachedFvcRate;
        estimateEl.textContent = '\u2248 ' + Math.floor(fvcAmount).toLocaleString() + ' FVC';
        // Sync USD field without re-triggering ETH input
        const usdEl = document.getElementById('purchase-amount-usd');
        if (usdEl && document.activeElement !== usdEl) usdEl.value = usdValue.toFixed(2);
    }

    _syncEthFromUsd(usdAmt) {
        const ethEl = document.getElementById('purchase-amount');
        const estimateEl = document.getElementById('fvc-estimate');
        if (!ethEl || !this._cachedEthUsd) return;
        if (!usdAmt || usdAmt <= 0) {
            ethEl.value = '';
            if (estimateEl) estimateEl.textContent = '0';
            return;
        }
        const ethAmt = usdAmt / this._cachedEthUsd;
        // Sync ETH field without re-triggering USD input
        if (document.activeElement !== ethEl) ethEl.value = ethAmt.toFixed(6);
        if (estimateEl) {
            const fvcAmount = usdAmt / this._cachedFvcRate;
            estimateEl.textContent = '\u2248 ' + Math.floor(fvcAmount).toLocaleString() + ' FVC';
        }
    }

    updateUSDCEstimate() {
        this.updateStablecoinEstimate();
    }

    updateStablecoinEstimate() {
        const amountEl = document.getElementById('purchase-amount');
        const estimateEl = document.getElementById('fvc-estimate');
        if (!amountEl || !estimateEl) return;
        const amount = parseFloat(amountEl.value);
        if (!amount || amount <= 0) { estimateEl.textContent = '0'; return; }
        const fvcAmount = amount / this._cachedFvcRate;
        estimateEl.textContent = '\u2248 ' + Math.floor(fvcAmount).toLocaleString() + ' FVC';
    }

    processETHPurchase() {
        const v = document.getElementById('purchase-amount').value;
        if (!v || parseFloat(v) <= 0) { alert('Enter an ETH amount'); return; }
        this.buyWithETH(v);
    }

    processUSDCPurchase() {
        const v = document.getElementById('purchase-amount').value;
        if (!v || parseFloat(v) <= 0) { alert('Enter a USDC amount'); return; }
        this.buyWithCrypto('USDC', v);
    }

    processUSDTPurchase() {
        const v = document.getElementById('purchase-amount').value;
        if (!v || parseFloat(v) <= 0) { alert('Enter a USDT amount'); return; }
        this.buyWithCrypto('USDT', v);
    }

    // ========== RENDER ==========

    render() {
        switch (this.currentStep) {
            case 1: this.renderStep1(); break;
            case 2: this.renderStep2(); break;
            case 3: this.renderStep3(); break;
            case 4: this.renderStep4(); break;
            case 5: this.renderStep5(); break;
        }
        this._injectTestnetBanner();
    }

    renderStep1() {
        const net = this.getNetworkName();
        this.container.innerHTML = `
            <div class="card p-5 text-center">
                <i class="bi bi-wallet2 display-1 text-warning mb-3"></i>
                <h3 class="mb-3">Connect Your Wallet</h3>
                <p class="text-muted mb-4">Connect your Web3 wallet to purchase FVC tokens</p>
                ${this.walletAddress ? `
                    <div class="alert alert-success d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-check-circle-fill me-2"></i>
                            <span><strong>Connected:</strong> ${this.walletAddress.substring(0,6)}...${this.walletAddress.substring(38)}</span>
                        </div>
                        <button class="btn btn-sm btn-outline-danger" onclick="buyWizard.disconnectWallet()">Disconnect</button>
                    </div>
                    <button class="btn btn-warning btn-lg px-5 mt-3" onclick="buyWizard.completeStep(1);buyWizard.goToStep(2)">
                        Continue to Payment <i class="bi bi-arrow-right"></i>
                    </button>
                    <button class="btn btn-outline-secondary btn-lg px-5 mt-2" onclick="buyWizard.goToStep(5)">
                        <i class="bi bi-lock me-1"></i> View My Vesting
                    </button>
                ` : `
                    <button class="btn btn-warning btn-lg px-5 mb-3" onclick="buyWizard.connectWallet()">
                        <i class="bi bi-wallet2"></i> Connect Wallet
                    </button>
                    <div class="text-muted small">
                        <p class="mb-2"><strong>Network:</strong></p>
                        <span class="badge bg-warning text-dark">${net}</span>
                    </div>
                    <hr class="my-4">
                    <p class="text-muted small mb-2"><strong>Compatible Wallets:</strong></p>
                    <div class="d-flex justify-content-center gap-3 flex-wrap">
                        <span class="badge bg-light text-dark">MetaMask</span>
                        <span class="badge bg-light text-dark">Brave Wallet</span>
                        <span class="badge bg-light text-dark">Coinbase Wallet</span>
                        <span class="badge bg-light text-dark">Trust Wallet</span>
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
                    <div class="col-md-3">
                        <div class="card h-100 payment-option" onclick="buyWizard.selectPayment('usdc')">
                            <div class="card-body text-center p-4">
                                <img src="https://assets.coingecko.com/coins/images/6319/large/usdc.png" alt="USDC" width="72" height="72" class="mb-3" style="border-radius:50%">
                                <h4>USDC</h4>
                                <p class="text-muted">Stablecoin purchase</p>
                                <span class="badge bg-success mb-3">Available Now</span>
                                <ul class="text-start">
                                    <li>Direct to smart contract</li>
                                    <li>FVC minted instantly</li>
                                    <li>Requires USDC in wallet</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card h-100 payment-option" onclick="buyWizard.selectPayment('usdt')">
                            <div class="card-body text-center p-4">
                                <img src="https://assets.coingecko.com/coins/images/325/large/Tether.png" alt="USDT" width="72" height="72" class="mb-3" style="border-radius:50%">
                                <h4>USDT</h4>
                                <p class="text-muted">Tether stablecoin</p>
                                <span class="badge bg-success mb-3">Available Now</span>
                                <ul class="text-start">
                                    <li>Direct to smart contract</li>
                                    <li>FVC minted instantly</li>
                                    <li>Requires USDT in wallet</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card h-100 payment-option" onclick="buyWizard.selectPayment('eth')">
                            <div class="card-body text-center p-4">
                                <img src="https://assets.coingecko.com/coins/images/279/large/ethereum.png" alt="ETH" width="72" height="72" class="mb-3" style="border-radius:50%">
                                <h4>ETH</h4>
                                <p class="text-muted">Pay with Ether</p>
                                <span class="badge bg-success mb-3">Available Now</span>
                                <ul class="text-start">
                                    <li>Pay with native ETH</li>
                                    <li>No approval step needed</li>
                                    <li>FVC minted instantly</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card h-100" style="opacity:0.6;cursor:not-allowed">
                            <div class="card-body text-center p-4">
                                <i class="bi bi-credit-card display-3 text-muted mb-3"></i>
                                <h4>Credit/Debit Card</h4>
                                <p class="text-muted">Powered by MoonPay</p>
                                <span class="badge bg-warning text-dark mb-3">Coming Soon</span>
                                <ul class="text-start text-muted">
                                    <li>Instant purchase</li>
                                    <li>KYC handled by MoonPay</li>
                                    <li>Supports major cards</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="text-center mt-4">
                    <button class="btn btn-outline-secondary btn-sm" onclick="buyWizard.goToStep(1)">
                        <i class="bi bi-arrow-left me-1"></i> Back
                    </button>
                </div>
            </div>
            <style>.payment-option{cursor:pointer;transition:all .3s;border:2px solid transparent}.payment-option:hover{transform:translateY(-5px);box-shadow:0 4px 8px rgba(0,0,0,.2);border-color:#ffc107}</style>
        `;
    }

    selectPayment(method) {
        this.paymentMethod = method;
        this.completeStep(2);
        this.goToStep(3);
    }

    renderStep3() {
        const isETH = this.paymentMethod === 'eth';
        const isUSDT = this.paymentMethod === 'usdt';
        const isStablecoin = !isETH;
        const cur = isETH ? 'ETH' : (isUSDT ? 'USDT' : 'USDC');
        const estFn = isETH ? 'updateETHEstimate' : 'updateStablecoinEstimate';
        const buyFn = isETH ? 'processETHPurchase' : (isUSDT ? 'processUSDTPurchase' : 'processUSDCPurchase');
        const rateText = isETH
            ? (this._cachedEthUsd ? '1 ETH \u2248 $' + this._cachedEthUsd.toFixed(2) + ' (live) | 1 FVC = $' + this._cachedFvcRate.toFixed(4) : 'Fetching live ETH price...')
            : '1 FVC = $' + this._cachedFvcRate.toFixed(4) + ' ' + cur;

        // Build allowlist badge if investor has custom terms
        let allowlistBadge = '';
        let allocationInfo = '';
        if (this._isAllowlisted && this._investorTerms) {
            const t = this._investorTerms;
            allowlistBadge = `
                <div class="alert mb-4" style="background:rgba(106,112,228,0.15);border:1px solid rgba(106,112,228,0.3)">
                    <div class="d-flex align-items-center mb-2">
                        <i class="bi bi-star-fill me-2" style="color:#6A70E4"></i>
                        <strong>Seed Investor Terms</strong>
                    </div>
                    <div class="row small">
                        <div class="col-6">
                            <div class="text-muted">Your Price</div>
                            <div class="fw-bold">$${t.customRate > 0 ? t.customRate.toFixed(4) : this._cachedFvcRate.toFixed(4)}/FVC</div>
                        </div>
                        <div class="col-6">
                            <div class="text-muted">Vesting</div>
                            <div class="fw-bold">${t.cliffDays}d cliff, ${t.durationDays}d total</div>
                        </div>
                    </div>
                    ${t.maxAmount > 0 ? `
                    <div class="mt-2 small">
                        <div class="text-muted">Allocation</div>
                        <div class="d-flex align-items-center">
                            <div class="progress flex-grow-1 me-2" style="height:8px;background:rgba(255,255,255,0.1)">
                                <div class="progress-bar" style="width:${(t.spent / t.maxAmount * 100).toFixed(1)}%;background:#6A70E4"></div>
                            </div>
                            <span class="fw-bold">$${t.remaining.toLocaleString()} left</span>
                        </div>
                    </div>` : ''}
                </div>`;
        }

        this.container.innerHTML = `
            <div class="card p-5">
                <h3 class="text-center mb-4">Purchase FVC with ${cur}</h3>
                ${allowlistBadge}
                <div class="mb-2">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <label class="form-label fw-bold mb-0">You pay</label>
                        <span class="text-muted small" id="wallet-balance">${this.walletAddress ? 'Fetching...' : 'Wallet not connected'}</span>
                    </div>
                    <div class="input-group input-group-lg">
                        <input type="number" class="form-control" id="purchase-amount" placeholder="0.00" step="any" min="0" oninput="buyWizard.${estFn}()" />
                        <span class="input-group-text fw-bold">${cur}</span>
                    </div>
                    ${isETH ? `
                    <div class="input-group input-group-lg mt-2">
                        <span class="input-group-text text-muted">≈</span>
                        <input type="number" class="form-control" id="purchase-amount-usd" placeholder="or enter USD amount" step="any" min="0"
                            oninput="buyWizard._syncEthFromUsd(parseFloat(this.value)||0)" />
                        <span class="input-group-text fw-bold text-muted">USD</span>
                    </div>
                    <div class="text-muted small mt-1 text-center">Enter ETH <strong>or</strong> USD — the other updates automatically</div>
                    ` : ''}
                </div>
                <div class="d-flex gap-2 mb-3">
                    <button class="btn btn-outline-secondary btn-sm flex-fill" onclick="buyWizard.setPercentage(25)">25%</button>
                    <button class="btn btn-outline-secondary btn-sm flex-fill" onclick="buyWizard.setPercentage(50)">50%</button>
                    <button class="btn btn-outline-secondary btn-sm flex-fill" onclick="buyWizard.setPercentage(75)">75%</button>
                    <button class="btn btn-outline-warning btn-sm flex-fill fw-bold" onclick="buyWizard.setPercentage(100)">MAX</button>
                </div>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <label class="form-label fw-bold mb-0">You receive</label>
                    <span class="text-muted small">FVC</span>
                </div>
                <div id="fvc-estimate" class="form-control form-control-lg bg-light text-center fw-bold mb-2" style="min-height:48px;line-height:32px">0</div>
                <div id="eth-rate-info" class="text-center text-muted small mb-3">${rateText}</div>
                <div id="transaction-status" class="text-center text-muted mb-3"></div>
                <button class="btn btn-warning btn-lg w-100" onclick="buyWizard.${buyFn}()">Buy FVC</button>
                <button class="btn btn-outline-secondary w-100 mt-2" onclick="buyWizard.goToStep(2)">Back</button>
            </div>
        `;
        this.loadWalletBalance();
    }

    renderStep4() {
        const url = this.lastTxHash ? this.getExplorerUrl(this.lastTxHash) : '#';
        const pay = this.paymentMethod === 'eth' ? 'ETH' : (this.paymentMethod === 'usdt' ? 'USDT' : 'USDC');
        const fvcDisplay = this.lastFvcAmount
            ? parseFloat(ethers.utils.formatEther(this.lastFvcAmount)).toLocaleString(undefined, {maximumFractionDigits: 4}) + ' FVC'
            : null;
        this.container.innerHTML = `
            <div class="card p-5 text-center">
                <i class="bi bi-check-circle display-1 text-success mb-3"></i>
                <h3 class="mb-3">Purchase Complete!</h3>
                ${fvcDisplay ? `
                <div class="mb-4">
                    <div class="text-muted small mb-1">You purchased</div>
                    <div class="fw-bold" style="font-size:2rem;color:#6A70E4">${fvcDisplay}</div>
                    <div class="text-muted small mt-1"><i class="bi bi-lock-fill me-1"></i>Locked in vesting — claimable after cliff</div>
                </div>` : `<p class="text-muted mb-4">Your FVC tokens have been minted and are now vesting</p>`}
                <div class="alert alert-success text-start">
                    <strong>Transaction Details:</strong>
                    <ul class="mb-0">
                        <li>Wallet: ${this.walletAddress.substring(0,6)}...${this.walletAddress.substring(38)}</li>
                        <li>Payment: ${pay}</li>
                        <li>Network: ${this.getNetworkName()}</li>
                        ${this.lastTxHash ? '<li>Tx: <a href="'+url+'" target="_blank">'+this.lastTxHash.substring(0,10)+'...'+this.lastTxHash.substring(58)+'</a></li>' : ''}
                    </ul>
                </div>
                <button class="btn btn-warning btn-lg w-100 mb-3" onclick="buyWizard.completeStep(4);buyWizard.goToStep(5)">
                    <i class="bi bi-lock-fill me-2"></i> View My Vesting Schedule
                </button>
                <button class="btn btn-outline-secondary w-100 mb-3" onclick="buyWizard.addFVCToWallet()">
                    <img src="${this.config.fvcLogoUrl}" alt="FVC" style="height:16px;width:16px;margin-right:6px">
                    Add FVC to Wallet
                </button>
                <a href="/" class="btn btn-outline-secondary w-100">Return to Home</a>
            </div>
        `;
        this.addFVCToWallet();
    }

    getVestingABI() {
        return [
            'function scheduleCount(address) external view returns (uint256)',
            'function getAllSchedules(address) external view returns (tuple(uint256 totalAmount, uint256 released, uint256 startTime, uint256 cliff, uint256 duration, bool revoked)[])',
            'function releasableAmount(address, uint256) external view returns (uint256)',
        ];
    }

    async renderStep5() {
        this.container.innerHTML = `
            <div class="card p-5 text-center">
                <div class="spinner-border mb-3" role="status"></div>
                <p class="text-muted">Loading your vesting schedules...</p>
            </div>
        `;

        try {
            const rpc = this._getRpcProvider();
            if (!rpc || !this.config.vestingAddress || !this.walletAddress) {
                throw new Error('Missing config');
            }

            const vesting = new ethers.Contract(this.config.vestingAddress, this.getVestingABI(), rpc);
            const count = await vesting.scheduleCount(this.walletAddress);
            const countNum = count.toNumber ? count.toNumber() : Number(count);

            if (countNum === 0) {
                this.container.innerHTML = `
                    <div class="card p-5 text-center">
                        <i class="bi bi-inbox display-1 text-muted mb-3"></i>
                        <h4>No Vesting Schedules Found</h4>
                        <p class="text-muted">Your purchase may still be confirming. Check back shortly.</p>
                        <button class="btn btn-warning mt-3" onclick="buyWizard.renderStep5()">
                            <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                        </button>
                        <button class="btn btn-outline-secondary mt-2" onclick="buyWizard.goToStep(1)">Back</button>
                    </div>
                `;
                return;
            }

            const schedules = await vesting.getAllSchedules(this.walletAddress);
            let totalLocked = ethers.BigNumber.from(0);
            let totalReleasable = ethers.BigNumber.from(0);

            const rows = await Promise.all(schedules.map(async (s, i) => {
                const releasable = await vesting.releasableAmount(this.walletAddress, i);
                const locked = s.totalAmount.sub(s.released);
                totalLocked = totalLocked.add(locked);
                totalReleasable = totalReleasable.add(releasable);

                const cliffEnd = new Date(s.startTime.add(s.cliff).toNumber() * 1000);
                const vestEnd  = new Date(s.startTime.add(s.duration).toNumber() * 1000);
                const now = Date.now();
                const cliffPassed = now > cliffEnd.getTime();
                const fullyVested = now > vestEnd.getTime();

                const pct = fullyVested ? 100 : cliffPassed
                    ? Math.min(100, Math.floor(
                        (now / 1000 - s.startTime.add(s.cliff).toNumber()) /
                        (s.duration.sub(s.cliff).toNumber()) * 100
                      ))
                    : 0;

                const fmt = (bn) => parseFloat(ethers.utils.formatEther(bn)).toLocaleString(undefined, {maximumFractionDigits: 4});
                const fmtDate = (d) => d.toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'});

                const statusBadge = s.revoked
                    ? '<span class="badge bg-danger">Revoked</span>'
                    : fullyVested
                    ? '<span class="badge bg-success">Fully Vested</span>'
                    : cliffPassed
                    ? '<span class="badge bg-warning text-dark">Vesting</span>'
                    : '<span class="badge" style="background:rgba(106,112,228,0.7)">In Cliff</span>';

                const releasableNum = parseFloat(ethers.utils.formatEther(releasable));
                const claimBtn = (!s.revoked && releasableNum > 0)
                    ? `<button
                            class="btn btn-success btn-sm mt-3 w-100"
                            id="claim-btn-${i}"
                            onclick="buyWizard.claimSchedule(${i})"
                        >
                            <i class="bi bi-box-arrow-in-down me-1"></i>
                            Claim ${fmt(releasable)} FVC
                        </button>`
                    : '';

                return `
                    <div class="card mb-3 text-start" style="border:1px solid rgba(106,112,228,0.3)">
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h6 class="mb-0 fw-bold">Schedule #${i + 1}</h6>
                                ${statusBadge}
                            </div>
                            <div class="row g-3 mb-3">
                                <div class="col-6 col-md-3 text-center">
                                    <div class="text-muted small">Total Allocation</div>
                                    <div class="fw-bold">${fmt(s.totalAmount)} FVC</div>
                                </div>
                                <div class="col-6 col-md-3 text-center">
                                    <div class="text-muted small">Locked</div>
                                    <div class="fw-bold">${fmt(locked)} FVC</div>
                                </div>
                                <div class="col-6 col-md-3 text-center">
                                    <div class="text-muted small">Claimable Now</div>
                                    <div class="fw-bold" style="color:#6A70E4">${fmt(releasable)} FVC</div>
                                </div>
                                <div class="col-6 col-md-3 text-center">
                                    <div class="text-muted small">Claimed</div>
                                    <div class="fw-bold">${fmt(s.released)} FVC</div>
                                </div>
                            </div>
                            <div class="mb-2">
                                <div class="d-flex justify-content-between small text-muted mb-1">
                                    <span>Vested</span><span>${pct}%</span>
                                </div>
                                <div class="progress" style="height:8px;background:rgba(255,255,255,0.1)">
                                    <div class="progress-bar" style="width:${pct}%;background:#6A70E4"></div>
                                </div>
                            </div>
                            <div class="row g-2 mt-1">
                                <div class="col-6 small text-muted">
                                    <i class="bi bi-hourglass-split me-1"></i>
                                    Cliff ends: <strong class="text-white">${fmtDate(cliffEnd)}</strong>
                                </div>
                                <div class="col-6 small text-muted">
                                    <i class="bi bi-calendar-check me-1"></i>
                                    Fully vested: <strong class="text-white">${fmtDate(vestEnd)}</strong>
                                </div>
                            </div>
                            <div id="claim-status-${i}"></div>
                            ${claimBtn}
                        </div>
                    </div>
                `;
            }));

            const fmt = (bn) => parseFloat(ethers.utils.formatEther(bn)).toLocaleString(undefined, {maximumFractionDigits: 4});

            this.container.innerHTML = `
                <div class="card p-4">
                    <div class="text-center mb-4">
                        <i class="bi bi-lock-fill display-4 mb-2" style="color:#6A70E4"></i>
                        <h4 class="mb-1">Your Vesting Schedules</h4>
                        <p class="text-muted small">${this.walletAddress.substring(0,6)}...${this.walletAddress.substring(38)}</p>
                    </div>
                    <div class="row g-3 mb-4 text-center">
                        <div class="col-4">
                            <div class="p-3 rounded" style="background:rgba(106,112,228,0.1);border:1px solid rgba(106,112,228,0.2)">
                                <div class="text-muted small">Total Schedules</div>
                                <div class="fw-bold fs-4">${countNum}</div>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="p-3 rounded" style="background:rgba(106,112,228,0.1);border:1px solid rgba(106,112,228,0.2)">
                                <div class="text-muted small">Total Locked</div>
                                <div class="fw-bold fs-5">${fmt(totalLocked)} FVC</div>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="p-3 rounded" style="background:rgba(40,167,69,0.1);border:1px solid rgba(40,167,69,0.2)">
                                <div class="text-muted small">Claimable Now</div>
                                <div class="fw-bold fs-5" style="color:#28a745">${fmt(totalReleasable)} FVC</div>
                            </div>
                        </div>
                    </div>
                    ${rows.join('')}
                    <div class="text-center mt-3">
                        <button class="btn btn-outline-secondary btn-sm me-2" onclick="buyWizard.renderStep5()">
                            <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="buyWizard.goToStep(1)">
                            <i class="bi bi-arrow-left me-1"></i> Back
                        </button>
                    </div>
                </div>
            `;
        } catch (e) {
            this.container.innerHTML = `
                <div class="card p-5 text-center">
                    <i class="bi bi-exclamation-triangle display-1 text-warning mb-3"></i>
                    <h4>Could not load vesting data</h4>
                    <p class="text-muted">${e.message || 'Network error'}</p>
                    <button class="btn btn-warning mt-3" onclick="buyWizard.renderStep5()">Try Again</button>
                    <button class="btn btn-outline-secondary mt-2" onclick="buyWizard.goToStep(1)">Back</button>
                </div>
            `;
        }
    }

    async claimSchedule(scheduleId) {
        const btn = document.getElementById(`claim-btn-${scheduleId}`);
        const statusEl = document.getElementById(`claim-status-${scheduleId}`);

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Confirming...';
        }

        try {
            if (!window.ethereum) throw new Error('No wallet connected');

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();

            const vestingAbi = [
                'function release(uint256 scheduleId) external'
            ];
            const vesting = new ethers.Contract(this.config.vestingAddress, vestingAbi, signer);

            const tx = await vesting.release(scheduleId);

            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="alert alert-info mt-3 mb-0 py-2 small">
                        <i class="bi bi-clock me-1"></i>
                        Transaction submitted — waiting for confirmation...
                        <a href="https://etherscan.io/tx/${tx.hash}" target="_blank" class="ms-1">View</a>
                    </div>`;
            }

            await tx.wait();

            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="alert alert-success mt-3 mb-0 py-2 small">
                        <i class="bi bi-check-circle me-1"></i>
                        Claimed successfully! FVC sent to your wallet.
                        <a href="https://etherscan.io/tx/${tx.hash}" target="_blank" class="ms-1">View tx</a>
                    </div>`;
            }
            if (btn) btn.style.display = 'none';

            // Refresh the dashboard after 2 seconds
            setTimeout(() => this.renderStep5(), 2000);

        } catch (e) {
            const msg = e?.reason || e?.data?.message || e?.message || 'Transaction failed';
            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="alert alert-danger mt-3 mb-0 py-2 small">
                        <i class="bi bi-x-circle me-1"></i> ${msg}
                    </div>`;
            }
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-box-arrow-in-down me-1"></i> Retry Claim';
            }
        }
    }
}

window.FVCBuyWizard = FVCBuyWizard;

window.FVCBuyWizard = FVCBuyWizard;
