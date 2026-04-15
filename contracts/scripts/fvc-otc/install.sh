#!/bin/bash

# FVC OTC Terminal Installer
# Creates a desktop entry so you can search "FVC OTC" from your launcher

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FVC_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Create the launcher script
cat > ~/.local/bin/fvc-otc << EOF
#!/bin/bash
cd "$FVC_DIR"
npx hardhat run scripts/otc-ui.ts --network mainnet
read -p "Press Enter to close..."
EOF

chmod +x ~/.local/bin/fvc-otc

# Create desktop entry
mkdir -p ~/.local/share/applications

cat > ~/.local/share/applications/fvc-otc.desktop << EOF
[Desktop Entry]
Name=FVC OTC Terminal
Comment=Propose OTC token mints to Safe
Exec=gnome-terminal -- bash -c "~/.local/bin/fvc-otc"
Icon=utilities-terminal
Terminal=false
Type=Application
Categories=Finance;Development;
Keywords=fvc;otc;crypto;token;safe;
EOF

# Update desktop database
update-desktop-database ~/.local/share/applications 2>/dev/null || true

echo ""
echo "  ✅ Installed!"
echo ""
echo "  You can now:"
echo "    1. Press Super (Windows key)"
echo "    2. Type 'FVC OTC'"
echo "    3. Hit Enter"
echo ""
echo "  Or run from terminal: fvc-otc"
echo ""
