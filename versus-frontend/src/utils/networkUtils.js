// Get the network IP address for QR code generation
export const getNetworkUrl = (path = '') => {
  // In development, try to get the local network IP
  if (import.meta.env.DEV) {
    // Get the current hostname from the browser
    const hostname = window.location.hostname;
    
    // If we're on localhost, try to detect network IP
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // For development, we'll use a placeholder that users can replace
      // In a real setup, this would be configured properly
      return `http://192.168.1.100:5174${path}`;
    }
    
    // Use the current hostname with the dev port
    return `http://${hostname}:5174${path}`;
  }
  
  // In production, use the current domain
  return `${window.location.origin}${path}`;
};

// Get the backend API URL (for API calls)
export const getBackendUrl = () => {
  // Check if there's a manually set IP in localStorage
  const manualIP = localStorage.getItem('versus_network_ip');
  if (manualIP) {
    return `http://${manualIP}:8000`;
  }
  
  // In development, try to get the local network IP
  if (import.meta.env.DEV) {
    // Get the current hostname from the browser
    const hostname = window.location.hostname;
    
    // If we're on localhost, default to localhost for backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    
    // Use the current hostname with the backend port
    return `http://${hostname}:8000`;
  }
  
  // In production, use the current domain
  return window.location.origin;
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

// Utility to detect local network IP (for display purposes)
export const detectNetworkIP = async () => {
  try {
    // Create a dummy peer connection to get local IP
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    pc.createDataChannel('');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    return new Promise((resolve) => {
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) return;
        const myIP = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(ice.candidate.candidate)[1];
        pc.close();
        resolve(myIP);
      };
    });
  } catch (error) {
    console.warn('Could not detect network IP:', error);
    return '192.168.1.100'; // fallback
  }
}; 