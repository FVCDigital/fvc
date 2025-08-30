# FVC Protocol - Private Sale Card

**Standalone JavaScript component for easy website integration**

This package contains a fully functional, standalone version of the FVC Protocol Private Sale Card that can be easily integrated into any website. The component is currently in "Coming Soon" mode with all functionality disabled, ready to be activated when the private sale goes live.

## What's Included

- **`PrivateSaleCard.js`** - Main component file (standalone JavaScript)
- **`demo.html`** - Live demo showing the component in action
- **`README.md`** - This integration guide

## Features

- **Coming Soon State** - All buttons disabled, shows "Coming Soon" message
- **Progressive Pricing Display** - Shows 4-tier pricing structure ($0.025 → $0.10)
- **Vesting Schedule** - Displays 12-month cliff + 24-month linear vesting
- **Responsive Design** - Works perfectly on all device sizes
- **Customisable Theme** - Easy to match your website's design
- **No Dependencies** - Pure JavaScript, no external libraries required

## Quick Integration

### 1. Basic Setup

```html
<!DOCTYPE html>
<html>
<head>
    <title>Your Website</title>
    <!-- Import Inter font for best typography -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <!-- Container for the Private Sale Card -->
    <div id="fvc-private-sale"></div>
    
    <!-- Include the Private Sale Card script -->
    <script src="PrivateSaleCard.js"></script>
    
    <!-- Initialise the component -->
    <script>
        // Create the Private Sale Card
        const privateSaleCard = new FVCPrivateSaleCard('fvc-private-sale');
    </script>
</body>
</html>
```

### 2. Advanced Setup with Custom Theme

```html
<script>
    // Customise the theme to match your website
    const privateSaleCard = new FVCPrivateSaleCard('fvc-private-sale', {
        theme: {
            modalBackground: '#1E1E1E',    // Custom background
            primaryText: '#FFFFFF',        // Custom text colour
            generalButton: '#FF6B6B',      // Custom accent colour
            // ... other theme options
        }
    });
</script>
```

## Responsive Design

The component automatically adapts to different screen sizes:

- **Desktop**: Full-width layout with optimal spacing
- **Tablet**: Adjusted padding and margins
- **Mobile**: Stacked layout with touch-friendly buttons

## Current State: Coming Soon

The component is currently configured to show:

- All Information Displayed - Pricing, vesting, allocation
- No Functional Buttons - All inputs and buttons are disabled
- Coming Soon Badge - Clear indication that functionality is pending
- Static Data - Shows example values (0 progress, $0.025 price)

## Future Activation

When the private sale goes live, the component can be easily updated to:

1. **Enable Input Fields** - Remove disabled state
2. **Activate Buttons** - Enable investment functionality
3. **Connect to Blockchain** - Integrate with Web3 wallets
4. **Real-time Updates** - Show live progress and pricing
5. **Transaction Handling** - Process USDC investments

## Integration Checklist

- Download `PrivateSaleCard.js` file
- Add script tag to your HTML
- Create container div with unique ID
- Initialise component with `new FVCPrivateSaleCard()`
- Test on different screen sizes
- Customise theme colours if needed

## Troubleshooting

### Common Issues

1. **Component not showing**: Check that the container ID exists and script is loaded
2. **Styling conflicts**: Ensure no CSS is overriding the component styles
3. **Font issues**: Make sure Inter font is loaded or fallback fonts are available

### Debug Mode

```javascript
// Enable console logging for debugging
const privateSaleCard = new FVCPrivateSaleCard('fvc-private-sale');
console.log('Card instance:', privateSaleCard);
```

## Roadmap

- **Phase 1**: Coming Soon display (Current)
- **Phase 2**: Enable input fields and buttons
- **Phase 3**: Web3 wallet integration
- **Phase 4**: Real-time blockchain data
- **Phase 5**: Full investment functionality

---

**Ready for integration!** The component is designed to be a seamless addition to your website whilst maintaining the professional look and feel of the FVC Protocol.
