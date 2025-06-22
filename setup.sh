#!/bin/bash

# Versus Complete Setup Script
echo "Setting up Versus (Frontend + Backend)..."

# Check if we're in the right directory
if [ ! -f "versus-frontend/package.json" ] || [ ! -f "backend/requirements.txt" ]; then
    echo "Error: Please run this script from the Versus project root directory"
    exit 1
fi

echo "=== Setting up Frontend (Node.js) ==="
cd versus-frontend

# Use the correct Node.js version (from .nvmrc)
if command -v nvm &> /dev/null; then
    echo "Using Node.js version from .nvmrc..."
    nvm use
else
    echo "nvm not found. Please ensure Node.js >=18 is installed."
fi

# Check Node.js version
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

cd ..

echo ""
echo "=== Setting up Backend (Python) ==="
cd backend

# Check if we're in a virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Warning: No virtual environment detected. Please activate your venv first:"
    echo "  source your_venv/bin/activate"
    exit 1
fi

echo "Using virtual environment: $VIRTUAL_ENV"

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

cd ..

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "To start the development servers:"
echo ""
echo "1. Start the backend (make sure your venv is activated):"
echo "   cd backend"
echo "   python main.py"
echo ""
echo "2. Start the frontend (in a new terminal):"
echo "   cd versus-frontend"
echo "   nvm use"
echo "   npm run dev"
echo ""
echo "The frontend will be available at: http://localhost:5173"
echo "The backend will be available at: http://localhost:8000" 