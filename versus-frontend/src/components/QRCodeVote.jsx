import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Settings } from 'lucide-react';
import { getConfigurableUrl, detectNetworkIP } from '../utils/networkUtils';

const QRCodeVote = ({ gameId, className = '' }) => {
  // Initialize with a default URL immediately
  const [displayUrl, setDisplayUrl] = useState(`http://localhost:5174/vote?gameId=${gameId}`);
  const [showIpConfig, setShowIpConfig] = useState(false);
  const [manualIP, setManualIP] = useState('');
  const [detectedIP, setDetectedIP] = useState('');

  useEffect(() => {
    // Always start with a default URL so QR code shows immediately
    const defaultUrl = `http://localhost:5174/vote?gameId=${gameId}`;
    setDisplayUrl(defaultUrl);

    // Get stored manual IP
    const storedIP = localStorage.getItem('versus_network_ip');
    if (storedIP) {
      setManualIP(storedIP);
      const newUrl = `http://${storedIP}:5174/vote?gameId=${gameId}`;
      setDisplayUrl(newUrl);
      console.log('Using stored IP for voting URL:', newUrl);
      return;
    }

    // Try to detect network IP in background
    detectNetworkIP().then((ip) => {
      setDetectedIP(ip);
      console.log('Detected network IP:', ip);
      
      if (ip && ip !== '192.168.1.100') {
        const newUrl = `http://${ip}:5174/vote?gameId=${gameId}`;
        setDisplayUrl(newUrl);
        console.log('Using detected IP for voting URL:', newUrl);
      }
    }).catch((error) => {
      console.error('Failed to detect network IP:', error);
      // Keep the default URL that was already set
    });
  }, [gameId]);

  const handleIPSave = () => {
    if (manualIP) {
      localStorage.setItem('versus_network_ip', manualIP);
      const newUrl = `http://${manualIP}:5174/vote?gameId=${gameId}`;
      setDisplayUrl(newUrl);
    } else {
      localStorage.removeItem('versus_network_ip');
      const newUrl = getConfigurableUrl(`/vote?gameId=${gameId}`);
      setDisplayUrl(newUrl);
    }
    setShowIpConfig(false);
  };

  return (
    <div className={`qr-code-container ${className}`}>
      <div className="text-center mb-4">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <h3 className="text-lg font-semibold text-white">
            Scan to Vote
          </h3>
          <button
            onClick={() => setShowIpConfig(!showIpConfig)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Configure network settings"
          >
            <Settings size={16} />
          </button>
        </div>
        <p className="text-sm text-gray-300 mb-4">
          Use your phone to scan and vote for your favorite model
        </p>
      </div>

      {/* IP Configuration */}
      {showIpConfig && (
        <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-600">
          <h4 className="text-sm font-medium text-white mb-2">Network Configuration</h4>
          
          {/* Debug Info */}
          <div className="mb-3 p-2 bg-gray-900 rounded text-xs">
            <p className="text-gray-400 mb-1">Debug Info:</p>
            {detectedIP && (
              <p className="text-green-400">Detected IP: {detectedIP}</p>
            )}
            <p className="text-blue-400">Current URL: {displayUrl}</p>
            <p className="text-yellow-400">Manual IP: {manualIP || 'Not set'}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-300 mb-2">
              Enter your computer's network IP address (e.g., 192.168.1.100 or 10.x.x.x):
            </p>
            <input
              type="text"
              placeholder="e.g., 192.168.1.100"
              value={manualIP}
              onChange={(e) => setManualIP(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400">
              💡 To find your IP: Run <code className="bg-gray-700 px-1 rounded">ifconfig</code> (Mac/Linux) or <code className="bg-gray-700 px-1 rounded">ipconfig</code> (Windows)
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleIPSave}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setShowIpConfig(false)}
                className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Cancel
              </button>
              {detectedIP && detectedIP !== '192.168.1.100' && (
                <button
                  onClick={() => {
                    setManualIP(detectedIP);
                    const newUrl = `http://${detectedIP}:5174/vote?gameId=${gameId}`;
                    setDisplayUrl(newUrl);
                    localStorage.setItem('versus_network_ip', detectedIP);
                    setShowIpConfig(false);
                  }}
                  className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                >
                  Use Detected
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white p-4 rounded-lg inline-block">
        <QRCodeSVG
          value={displayUrl || `http://localhost:5174/vote?gameId=${gameId}`}
          size={160}
          level="M"
          includeMargin={true}
          fgColor="#000000"
          bgColor="#ffffff"
        />
      </div>
      
      <div className="mt-3 text-center">
        <p className="text-xs text-gray-400 break-all">
          {displayUrl || 'Generating...'}
        </p>
      </div>
    </div>
  );
};

export default QRCodeVote; 