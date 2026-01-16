// FVC Protocol - Private Sale Card (Standalone Version)
// This is a standalone JavaScript component that can be integrated into any website
// Features: Coming Soon state with no functional buttons, displays private sale information

class FVCPrivateSaleCard {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = {
      theme: {
        appBackground: 'rgba(255, 255, 255, 0.2)',
        modalBackground: 'rgba(255, 255, 255, 0.2)',
        modalButton: 'rgba(255, 255, 255, 0.2)',
        primaryText: '#000000',
        secondaryText: '#9CA3AF',
        generalButton: '#9312cf',
        buttonText: '#FFFFFF',
        cardHover: 'rgba(255, 255, 255, 0.4)',
        accentGlow: 'rgba(147,18,207,0.2)',
        darkBorder: 'rgba(166, 166, 166, 0.4)',
        darkShadow: 'rgba(0,0,0,0.3)'
      },
      ...options
    };
    
    this.init();
  }

  init() {
    this.render();
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container with ID '${this.containerId}' not found`);
      return;
    }

    container.innerHTML = `
      <div class="fvc-private-sale-card" style="
        background: ${this.options.theme.modalBackground};
        color: ${this.options.theme.primaryText};
        border-radius: 16px;
        padding: 28px;
        font-weight: 500;
        font-size: 20px;
         
        margin: 16px auto;
        max-width: 800px;
        width: 100%;
         
        box-sizing: border-box;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: all 0.2s ease;
      ">
        <!-- Header -->
       

        <!-- Progress Section -->
       
          
          <!-- Current Price and Milestone -->
          <div style="
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            margin-bottom: 16px;
            padding: 16px;
            background: ${this.options.theme.darkBorder};
            border-radius: 8px;
          ">
            <div>
              <div style="font-size: 14px; color: ${this.options.theme.secondaryText}; margin-bottom: 4px;">
                Current Price
              </div>
              <div style="font-size: 18px; font-weight: 600; color: ${this.options.theme.primaryText};">
                $0.025 USDC/FVC
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 14px; color: ${this.options.theme.secondaryText}; margin-bottom: 4px;">
                Early Bird
              </div>
              <div style="font-size: 16px; font-weight: 600; color: ${this.options.theme.generalButton};">
                $0.025
              </div>
            </div>
          </div>

          <!-- Next Tier Info -->
          <div style="
            padding: 12px 16px;
            background: ${this.options.theme.darkBorder};
            border-radius: 8px;
            font-size: 14px;
            color: ${this.options.theme.secondaryText};
            text-align: center;
          ">
            Next tier at 16,666,667 FVC (416,667 USDC to go)
          </div>
        </div>

        <!-- Investment Form (Coming Soon) -->
        <div style="
          background: ${this.options.theme.cardHover};
          padding: 24px;
          border-radius: 12px;
           
          margin-bottom: 24px;
          max-width: 100%;
          overflow: hidden;
        ">
          <h3 style="
            font-size: 20px; 
            font-weight: 600; 
            margin-bottom: 20px; 
            color: ${this.options.theme.primaryText};
          ">
            Invest in Private Sale
          </h3>
          
          <div style="margin-bottom: 20px; width: 100%;">
            <label style="
              display: block; 
              font-size: 14px; 
              color: ${this.options.theme.secondaryText}; 
              margin-bottom: 8px;
            ">
              USDC Amount
            </label>
            <input
              type="number"
              placeholder="Amount"
              disabled
              style="
                width: 100%;
                min-width: 200px;
                padding: 12px 16px;
                background: ${this.options.theme.modalBackground};
                border: 1px solid ${this.options.theme.darkBorder};
                border-radius: 8px;
                color: ${this.options.theme.secondaryText};
                font-size: 16px;
                outline: none;
                box-sizing: border-box;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                cursor: not-allowed;
                opacity: 0.6;
              "
            />
            
            <div style="
              width: 100%; 
              margin: 8px 0 0 0; 
              display: flex; 
              flex-direction: row; 
              alignItems: center;
              justify-content: space-between
            ">
              <span style="
                font-size: 13; 
                color: ${this.options.theme.secondaryText}; 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                flex: 1 
              ">
                Balance: 0 USDC
              </span>
              <div style="display: flex; justify-content: flex-end; flex: 1; gap: 4px;">
                <button
                  type="button"
                  disabled
                  style="
                    background: transparent;
                    color: ${this.options.theme.secondaryText};
                    border: 1px solid transparent;
                    border-radius: 5px;
                    padding: 2px 10px;
                    font-weight: 600;
                    font-size: 12px;
                    cursor: not-allowed;
                    height: 22px;
                    min-width: 32px;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    opacity: 0.6;
                  "
                >
                  50%
                </button>
                <button
                  type="button"
                  disabled
                  style="
                    background: transparent;
                    color: ${this.options.theme.secondaryText};
                    border: 1px solid transparent;
                    border-radius: 5px;
                    padding: 2px 10px;
                    font-weight: 600;
                    font-size: 12px;
                    cursor: not-allowed;
                    height: 22px;
                    min-width: 32px;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    opacity: 0.6;
                  "
                >
                  MAX
                </button>
              </div>
            </div>
            
            <div style="font-size: 12px; color: ${this.options.theme.secondaryText}; margin-top: 4px;">
              Max: 2M USDC per wallet
            </div>
          </div>

          <button
            disabled
            style="
              width: 100%;
              padding: 14px 24px;
              background: ${this.options.theme.darkBorder};
              color: ${this.options.theme.secondaryText};
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: not-allowed;
              opacity: 0.6;
            "
          >
            Coming Soon
          </button>
        </div>

        <!-- Vesting Schedule Summary -->
        
      </div>
    `;
  }

  // Method to update the card (can be called later when functionality is added)
  update(data = {}) {
    // This method can be used to update the card with real data later
    console.log('Card updated with:', data);
  }

  // Method to destroy the card
  destroy() {
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = '';
    }
  }
}

// Export for use in different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FVCPrivateSaleCard;
} else if (typeof window !== 'undefined') {
  window.FVCPrivateSaleCard = FVCPrivateSaleCard;
}
