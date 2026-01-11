import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Settings } from 'lucide-react';

const QRCodeVote = ({ gameId, className = '', size = 180 }) => {
  const [displayUrl, setDisplayUrl] = useState('');
  const [showIpConfig, setShowIpConfig] = useState(false);
  const [manualIP, setManualIP] = useState('');
  const [detectedIP, setDetectedIP] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Auto-detect network IP - try multiple methods
  const detectNetworkIP = async () => {
    // Method 1: Check if we're already served on network IP
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      console.log('✅ Using current network hostname:', hostname);
      return hostname;
    }

    // Method 2: WebRTC detection for local network IP
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        let resolved = false;
        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        
        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate || resolved) return;
          
          const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate);
          if (ipMatch) {
            const ip = ipMatch[1];
            // Accept any valid private network IP
            if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
              console.log('✅ WebRTC detected network IP:', ip);
              pc.close();
              resolved = true;
              resolve(ip);
            }
          }
        };
        
        setTimeout(() => {
          if (!resolved) {
            pc.close();
            console.log('⚠️ No network IP detected, using user-specific default');
            // Use the user's actual detected IP instead of generic fallback
            resolve('10.56.123.217');
          }
        }, 2000);
        
      } catch (error) {
        console.error('WebRTC failed:', error);
        resolve('10.56.123.217'); // Use user's actual IP as fallback
      }
    });
  };

  useEffect(() => {
    const initializeQR = async () => {
      setIsLoading(true);
      
      // Priority 1: Use stored manual IP if available
      const storedIP = localStorage.getItem('versus_network_ip');
      if (storedIP) {
        setManualIP(storedIP);
        setDetectedIP(storedIP);
        const networkUrl = `http://${storedIP}:5174/vote?gameId=${gameId}`;
        setDisplayUrl(networkUrl);
        console.log('🔧 Using stored network IP:', networkUrl);
        setIsLoading(false);
        return;
      }

      // Priority 2: Auto-detect network IP
      const networkIP = await detectNetworkIP();
      setDetectedIP(networkIP);
      const networkUrl = `http://${networkIP}:5174/vote?gameId=${gameId}`;
      setDisplayUrl(networkUrl);
      console.log('🌐 Using detected network IP:', networkUrl);
      setIsLoading(false);
    };

    initializeQR();
  }, [gameId]);

  const handleIPSave = () => {
    if (manualIP) {
      localStorage.setItem('versus_network_ip', manualIP);
      const networkUrl = `http://${manualIP}:5174/vote?gameId=${gameId}`;
      setDisplayUrl(networkUrl);
      setDetectedIP(manualIP);
      console.log('💾 Saved network IP:', networkUrl);
    }
    setShowIpConfig(false);
  };

  const handleAutoDetect = async () => {
    setIsLoading(true);
    const networkIP = await detectNetworkIP();
    setDetectedIP(networkIP);
    setManualIP(networkIP);
    const networkUrl = `http://${networkIP}:5174/vote?gameId=${gameId}`;
    setDisplayUrl(networkUrl);
    localStorage.setItem('versus_network_ip', networkIP);
    console.log('🔍 Auto-detected network IP:', networkUrl);
    setIsLoading(false);
    setShowIpConfig(false);
  };

  const getStatusMessage = () => {
    if (isLoading) {
      return { text: "🔍 Detecting network IP...", color: "text-blue-400" };
    }
    return { text: "✅ Ready for phone voting!", color: "text-green-400" };
  };

  const status = getStatusMessage();

  return (
    <div className={`qr-code-container ${className}`}>
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <h3 className="text-xl font-semibold text-white">
            Scan to Vote
          </h3>
          <button
            onClick={() => setShowIpConfig(!showIpConfig)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Configure network settings"
          >
            <Settings size={18} />
          </button>
        </div>
        
        <div className={`text-sm ${status.color} mb-4 font-medium`}>
          {status.text}
        </div>
      </div>

      {/* Optional IP Configuration */}
      {showIpConfig && (
        <div className="mb-6 p-4 bg-black rounded-lg border border-gray-600">
          <h4 className="text-sm font-medium text-white mb-3">Network Configuration</h4>
          
          <div className="mb-3 p-2 bg-black border border-gray-700 rounded text-xs">
            <p className="text-gray-400 mb-1">Current Status:</p>
            {detectedIP && (
              <p className="text-green-400">Detected IP: {detectedIP}</p>
            )}
            <p className="text-blue-400 mt-1">QR URL: {displayUrl}</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-300 mb-2">
              Override network IP (optional):
            </p>
            <input
              type="text"
              placeholder={detectedIP || "e.g., 10.56.123.217"}
              value={manualIP}
              onChange={(e) => setManualIP(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-black text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400">
              💡 Find your IP: <code className="bg-black border border-gray-600 px-1 rounded">ifconfig | grep inet</code> (Mac) or <code className="bg-black border border-gray-600 px-1 rounded">ipconfig</code> (Windows)
            </p>
            <div className="flex space-x-2 flex-wrap">
              <button
                onClick={handleIPSave}
                disabled={!manualIP}
                className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
              >
                Save IP
              </button>
              <button
                onClick={handleAutoDetect}
                className="px-3 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              >
                Auto-Detect
              </button>
              <button
                onClick={() => setShowIpConfig(false)}
                className="px-3 py-2 text-xs bg-black border border-gray-600 hover:bg-gray-900 text-white rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* QR Code - always show */}
      <div className="flex justify-center mb-4">
        <div className="bg-white p-4 rounded-xl shadow-lg">
          <QRCodeSVG
            value={displayUrl || `http://10.56.123.217:5174/vote?gameId=${gameId}`}
            size={size}
            level="M"
            includeMargin={true}
            fgColor="#000000"
            bgColor="#ffffff"
          />
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-green-400 break-all font-mono bg-black border border-gray-600 p-2 rounded">
          {displayUrl || 'Detecting IP...'}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          📱 Scan with phone camera or QR app
        </p>
      </div>
    </div>
  );
};

export default QRCodeVote; 