# FVC Digital - Laravel Twill Website

This is the main FVC Digital website built with Laravel 11 and Twill CMS, featuring the "Buy FVC" token sale integration.

## Quick Start

### Prerequisites

- PHP 8.2+
- Composer
- Node.js 18+ / npm or yarn
- MySQL or MariaDB
- Git

### Installation

1. **Clone and Install Dependencies**

```bash
cd app-extracted
composer install
npm install
```

2. **Setup Environment**

```bash
cp .env.example .env
php artisan key:generate
```

3. **Configure Database**

Edit `.env`:

```bash
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fvc_local
DB_USERNAME=fvc_user
DB_PASSWORD=fvc_password
```

Create database:

```bash
mysql -u root -p
CREATE DATABASE fvc_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fvc_user'@'localhost' IDENTIFIED BY 'fvc_password';
GRANT ALL PRIVILEGES ON fvc_local.* TO 'fvc_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Import existing database (if you have a dump):

```bash
mysql -u fvc_user -p fvc_local < /path/to/database_dump.sql
```

Or run migrations:

```bash
php artisan migrate
```

4. **Configure BSC Integration**

Add deployed contract addresses to `.env`:

```bash
BSC_CHAIN_ID=97  # 97 for testnet, 56 for mainnet
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
BSC_FVC_ADDRESS=0x...
BSC_SALE_ADDRESS=0x...
BSC_VESTING_ADDRESS=0x...
BSC_USDC_ADDRESS=0x...
BSC_USDT_ADDRESS=0x...
```

See `../BSC_TESTNET_GUIDE.md` for deployment instructions.

5. **Start Development Servers**

```bash
# Terminal 1: Laravel
php artisan serve

# Terminal 2: Vite
npm run dev
```

6. **Access Application**

- **Frontend:** http://localhost:8000
- **Buy FVC:** http://localhost:8000/buy-fvc
- **Twill Admin:** http://localhost:8000/admin
- **Site Password:** `password123` (configured in `.env`)

## Project Structure

```
app-extracted/
├── app/
│   ├── Http/Controllers/     # Controllers
│   ├── Models/               # Eloquent models (Purchase, etc)
│   └── View/Components/      # Blade components
├── config/
│   └── services.php          # BSC/MoonPay config
├── database/
│   └── migrations/           # Database migrations
├── public/
│   └── assets/               # Static assets (CSS, JS, images)
├── resources/
│   ├── js/
│   │   ├── app.js            # Main JS entry
│   │   └── buy-fvc-wizard.js # Token sale wizard
│   └── views/
│       ├── components/       # Blade components
│       └── site/
│           ├── buy-fvc.blade.php  # Buy FVC page
│           └── page.blade.php     # Generic page template
├── routes/
│   ├── web.php               # Web routes
│   └── api.php               # API endpoints
└── vite.config.js            # Vite configuration
```

## Key Features

### Buy FVC Token Sale Flow

Multi-step wizard at `/buy-fvc`:

1. **Connect Wallet** - MetaMask/WalletConnect to BSC
2. **Choose Payment** - Card (MoonPay) or Crypto (USDC/USDT)
3. **Purchase** - Execute transaction
4. **Confirmation** - Success screen with transaction details

**Implementation:**
- Frontend: `resources/js/buy-fvc-wizard.js`
- Backend: `routes/api.php` (purchase tracking)
- Model: `app/Models/Purchase.php`
- View: `resources/views/site/buy-fvc.blade.php`

### Smart Contract Integration

Interacts with deployed BSC contracts:
- **FVC Token** - ERC20 with 1B cap
- **Sale Contract** - Fixed price sale ($0.025/FVC)
- **Vesting Contract** - 180d cliff, 730d vesting for large purchases

See `../contracts/` for contract source code.

### Twill CMS

Content management at `/admin`:
- Pages (with blocks)
- Menu management
- Media library
- Settings

## Development

### Adding New Features

1. **New Page/Route:**
   - Add route in `routes/web.php`
   - Create Blade view in `resources/views/site/`

2. **New Twill Block:**
   - Create component: `php artisan make:component Blocks/MyBlock`
   - Create view: `resources/views/site/blocks/myblock.blade.php`

3. **New API Endpoint:**
   - Add route in `routes/api.php`
   - Create controller if needed

### Frontend Assets

Vite compiles:
- `resources/js/app.js` → JavaScript bundle
- `resources/css/app.css` → CSS bundle (if added)

Build for production:

```bash
npm run build
```

### Database

Run migrations:

```bash
php artisan migrate
```

Create new migration:

```bash
php artisan make:migration create_something_table
```

Seed database:

```bash
php artisan db:seed
```

## Deployment

### Production Checklist

- [ ] Set `APP_ENV=production` in `.env`
- [ ] Set `APP_DEBUG=false`
- [ ] Generate app key: `php artisan key:generate`
- [ ] Configure production database
- [ ] Run migrations: `php artisan migrate --force`
- [ ] Build assets: `npm run build`
- [ ] Configure web server (Nginx/Apache)
- [ ] Set correct file permissions
- [ ] Configure HTTPS/SSL
- [ ] Update BSC config to mainnet (Chain ID 56)
- [ ] Add MoonPay production keys
- [ ] Setup cron for scheduled tasks
- [ ] Configure queue workers if using queues

### Mainnet Configuration

Update `.env` for BSC Mainnet:

```bash
BSC_CHAIN_ID=56
BSC_RPC_URL=https://bsc-dataseed1.binance.org
BSC_USDC_ADDRESS=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
BSC_USDT_ADDRESS=0x55d398326f99059fF775485246999027B3197955
# Add deployed mainnet contract addresses:
BSC_FVC_ADDRESS=0x...
BSC_SALE_ADDRESS=0x...
BSC_VESTING_ADDRESS=0x...
```

## Testing

### Test Purchase Flow (Testnet)

1. Deploy contracts to BSC Testnet (see `../BSC_TESTNET_GUIDE.md`)
2. Update `.env` with testnet addresses
3. Get testnet BNB from faucet
4. Mint test USDC/USDT to your wallet
5. Visit http://localhost:8000/buy-fvc
6. Complete purchase flow
7. Verify transaction on BSCScan Testnet

## Troubleshooting

### Common Issues

**"No application encryption key"**
```bash
php artisan key:generate
```

**"could not find driver"**
```bash
# Enable PDO MySQL in php.ini
extension=pdo_mysql
```

**"Vite manifest not found"**
```bash
npm run dev  # For development
# OR
npm run build  # For production
```

**"Class 'App\Models\Purchase' not found"**
```bash
composer dump-autoload
```

**Frontend not updating**
```bash
php artisan view:clear
php artisan config:clear
npm run dev
```

## Links

- **Contracts:** `../contracts/` - Smart contract source code
- **Deployment Guide:** `../BSC_TESTNET_GUIDE.md` - BSC deployment instructions
- **Main README:** `../README.md` - Project overview
- **Laravel Docs:** https://laravel.com/docs/11.x
- **Twill Docs:** https://twillcms.com/docs/

## Support

For issues or questions, check the project documentation or create an issue in the repository.
