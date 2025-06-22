#!/bin/bash

echo "🌐 Finding your network IP address for the voting system..."
echo ""

# macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macOS detected:"
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
    if [ ! -z "$IP" ]; then
        echo "✅ Your network IP: $IP"
        echo ""
        echo "📱 Your voting URL will be: http://$IP:5174/vote?gameId=YOUR_GAME_ID"
        echo ""
        echo "🔧 To configure this in the app:"
        echo "   1. Click the gear icon ⚙️ next to 'Scan to Vote'"
        echo "   2. Enter this IP: $IP"
        echo "   3. Click Save"
    else
        echo "❌ Could not detect network IP automatically"
    fi

# Linux
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Linux detected:"
    IP=$(hostname -I | awk '{print $1}')
    if [ ! -z "$IP" ]; then
        echo "✅ Your network IP: $IP"
        echo ""
        echo "📱 Your voting URL will be: http://$IP:5174/vote?gameId=YOUR_GAME_ID"
        echo ""
        echo "🔧 To configure this in the app:"
        echo "   1. Click the gear icon ⚙️ next to 'Scan to Vote'"
        echo "   2. Enter this IP: $IP"
        echo "   3. Click Save"
    else
        echo "❌ Could not detect network IP automatically"
    fi

# Windows (if running in Git Bash or similar)
else
    echo "Windows/Other OS detected:"
    echo "Please run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux) to find your IP"
fi

echo ""
echo "📋 Manual steps to find your IP:"
echo "   • macOS/Linux: Run 'ifconfig' and look for inet addr"
echo "   • Windows: Run 'ipconfig' and look for IPv4 Address"
echo "   • Look for an IP starting with 192.168.x.x or 10.x.x.x"
echo ""
echo "⚠️  Make sure your phone and computer are on the same WiFi network!" 