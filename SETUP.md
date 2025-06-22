# Versus Setup Guide

This project has **two parts** that need separate environments:

## Quick Setup (Recommended)

From the project root directory:
```bash
./setup.sh
```

This will automatically:
- Set up Node.js frontend dependencies
- Create and set up Python backend virtual environment
- Install all required packages

## Manual Setup

### Frontend (Node.js)
```bash
cd versus-frontend
nvm use  # Uses Node.js 20.19.2 (from .nvmrc)
npm install
npm run dev
```

### Backend (Python)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

## Requirements

- **Node.js**: >=18.0.0 (project uses 20.19.2)
- **Python**: 3.8+ (for backend)
- **nvm**: For Node.js version management

## Running the Application

1. **Start Backend** (Terminal 1):
   ```bash
   cd backend
   source venv/bin/activate
   python main.py
   ```

2. **Start Frontend** (Terminal 2):
   ```bash
   cd versus-frontend
   nvm use
   npm run dev
   ```

3. **Access the app**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

## Troubleshooting

- **Node.js issues**: Run `nvm use` in the frontend directory
- **Python issues**: Make sure you're in the virtual environment (`source venv/bin/activate`)
- **Port conflicts**: Check if ports 5173 or 8000 are already in use 