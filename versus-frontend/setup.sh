#!/bin/bash

# Versus Frontend Setup Script
echo "Setting up Versus Frontend..."

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

# Install dependencies
echo "Installing dependencies..."
npm install

echo "Setup complete! Run 'npm run dev' to start the development server." 