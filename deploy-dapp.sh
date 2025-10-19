#!/bin/bash

# Load environment variables
if [ -f .env.deploy ]; then
    export $(cat .env.deploy | grep -v '^#' | xargs)
else
    echo "Error: .env.deploy file not found"
    exit 1
fi

echo "Building dapp..."
cd /home/steak/Desktop/fvc-protocol/dapp

# Build
sudo yarn build

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo "Build complete. Uploading to cPanel..."

# Deploy via FTP
cd out
lftp -u "$FTP_USERNAME,$FTP_PASSWORD" "$FTP_HOST" <<EOF
set ssl:verify-certificate no
mirror -R --delete --verbose . $FTP_REMOTE_DIR
bye
EOF

if [ $? -eq 0 ]; then
    echo "✓ Deployment successful!"
    echo "Visit: https://dapp.fvcdigital.com"
else
    echo "✗ Deployment failed!"
    exit 1
fi
