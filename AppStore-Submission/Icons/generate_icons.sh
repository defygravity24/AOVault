#!/bin/bash

# AO Vault App Icon Generator
# Generates all required iOS app icon sizes from the master 1024x1024 design

echo "🎨 AO Vault Icon Generator"
echo "=========================="
echo ""

# Check if the HTML icon file exists
ICON_HTML="/Users/christinacooper/Desktop/icon-option-4.html"
if [ ! -f "$ICON_HTML" ]; then
    echo "❌ Error: Icon HTML file not found at $ICON_HTML"
    echo "Please ensure icon-option-4.html exists on your Desktop"
    exit 1
fi

echo "📸 Generating 1024x1024 master icon from HTML..."

# Generate the master 1024x1024 icon from HTML
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless \
  --disable-gpu \
  --screenshot=icon_1024.png \
  --window-size=1024,1024 \
  "file://$ICON_HTML"

if [ ! -f "icon_1024.png" ]; then
    echo "❌ Error: Failed to generate master icon"
    exit 1
fi

echo "✅ Master icon generated successfully"
echo ""
echo "🔄 Generating all iOS app icon sizes..."
echo ""

# Create Icons directory if it doesn't exist
mkdir -p AppIcons

# Generate all required iPhone sizes
echo "📱 iPhone Icons:"
sips -z 180 180 icon_1024.png --out AppIcons/AppIcon-60@3x.png >/dev/null 2>&1
echo "  ✓ 180×180 (60pt @3x)"

sips -z 120 120 icon_1024.png --out AppIcons/AppIcon-60@2x.png >/dev/null 2>&1
echo "  ✓ 120×120 (60pt @2x)"

sips -z 87 87 icon_1024.png --out AppIcons/AppIcon-29@3x.png >/dev/null 2>&1
echo "  ✓ 87×87 (29pt @3x)"

sips -z 80 80 icon_1024.png --out AppIcons/AppIcon-40@2x.png >/dev/null 2>&1
echo "  ✓ 80×80 (40pt @2x)"

sips -z 60 60 icon_1024.png --out AppIcons/AppIcon-20@3x.png >/dev/null 2>&1
echo "  ✓ 60×60 (20pt @3x)"

sips -z 58 58 icon_1024.png --out AppIcons/AppIcon-29@2x.png >/dev/null 2>&1
echo "  ✓ 58×58 (29pt @2x)"

sips -z 40 40 icon_1024.png --out AppIcons/AppIcon-40@1x.png >/dev/null 2>&1
echo "  ✓ 40×40 (40pt @1x)"

sips -z 40 40 icon_1024.png --out AppIcons/AppIcon-20@2x.png >/dev/null 2>&1
echo "  ✓ 40×40 (20pt @2x)"

echo ""
echo "📱 iPad Icons:"

# Generate iPad sizes
sips -z 167 167 icon_1024.png --out AppIcons/AppIcon-83.5@2x.png >/dev/null 2>&1
echo "  ✓ 167×167 (83.5pt @2x)"

sips -z 152 152 icon_1024.png --out AppIcons/AppIcon-76@2x.png >/dev/null 2>&1
echo "  ✓ 152×152 (76pt @2x)"

sips -z 76 76 icon_1024.png --out AppIcons/AppIcon-76@1x.png >/dev/null 2>&1
echo "  ✓ 76×76 (76pt @1x)"

sips -z 29 29 icon_1024.png --out AppIcons/AppIcon-29@1x.png >/dev/null 2>&1
echo "  ✓ 29×29 (29pt @1x)"

sips -z 20 20 icon_1024.png --out AppIcons/AppIcon-20@1x.png >/dev/null 2>&1
echo "  ✓ 20×20 (20pt @1x)"

echo ""
echo "🏪 App Store Icon:"

# Copy the master icon for App Store
cp icon_1024.png AppIcons/AppIcon-1024.png
echo "  ✓ 1024×1024 (App Store)"

echo ""
echo "========================================="
echo "✅ All icons generated successfully!"
echo ""
echo "📁 Icons saved to: $(pwd)/AppIcons/"
echo ""
echo "📋 Next steps:"
echo "1. Open Xcode and navigate to Assets.xcassets"
echo "2. Select the AppIcon asset"
echo "3. Drag each icon to its corresponding slot"
echo "4. Build and run to test"
echo ""
echo "💡 Tip: To open the icons folder, run:"
echo "   open $(pwd)/AppIcons/"
echo "========================================="