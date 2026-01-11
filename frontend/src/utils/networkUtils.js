// Get the network IP address for QR code generation
export const getNetworkUrl = (path = '') => {
  // Get the current hostname from the browser
  const hostname = window.location.hostname;
  
  // If we're on localhost, try to detect network IP
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // When running on localhost, we need to detect the actual IP
    return `http://localhost:5174${path}`;
  }
  
  // Use the current hostname (which will be the network IP when Vite serves on 0.0.0.0)
  return `http://${hostname}:5174${path}`;
};

// Get the backend API URL (for API calls)
export const getBackendUrl = () => {
  // Check if there's a manually set IP in localStorage
  const manualIP = localStorage.getItem('versus_network_ip');
  if (manualIP) {
    return `http://${manualIP}:8000`;
  }
  
  // Get the current hostname from the browser
  const hostname = window.location.hostname;
  
  // If we're on localhost, default to localhost for backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  
  // Use the current hostname with the backend port
  return `http://${hostname}:8000`;
};

// Alternative: Allow manual IP configuration
export const getConfigurableUrl = (path = '') => {
  // Check if there's a manually set IP in localStorage
  const manualIP = localStorage.getItem('versus_network_ip');
  if (manualIP) {
    return `http://${manualIP}:5174${path}`;
  }
  
  // Fall back to automatic detection
  return getNetworkUrl(path);
};

// Get the machine's local IP address automatically - improved version
export const getLocalIP = () => {
  return new Promise((resolve) => {
    // Method 1: Try WebRTC first (most reliable)
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      let resolved = false;
      
      pc.createDataChannel('');
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate || resolved) return;
        
        // Look for IPv4 addresses that are not localhost
        const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate);
        if (ipMatch) {
          const ip = ipMatch[1];
          // Skip localhost, 127.x.x.x, and 169.254.x.x (link-local)
          if (!ip.startsWith('127.') && !ip.startsWith('169.254.') && ip !== '0.0.0.0') {
            console.log('✅ WebRTC detected IP:', ip);
            pc.close();
            resolved = true;
            resolve(ip);
          }
        }
      };
      
      // Timeout after 3 seconds
      setTimeout(() => {
        if (!resolved) {
          pc.close();
          console.log('⚠️ WebRTC timeout, trying fallback...');
          
          // Method 2: Fallback - try to get from current URL if we're on network
          const hostname = window.location.hostname;
          if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            console.log('✅ Using current hostname as IP:', hostname);
            resolve(hostname);
          } else {
            console.log('❌ Could not detect network IP');
            resolve(null);
          }
        }
      }, 3000);
      
    } catch (error) {
      console.warn('WebRTC failed, using fallback:', error);
      
      // Fallback method
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        resolve(hostname);
      } else {
        resolve(null);
      }
    }
  });
};

// Simple utility for backward compatibility
export const detectNetworkIP = getLocalIP; 