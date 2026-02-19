# VisionForge AI - Object Detection Platform

A production-grade real-time computer vision platform comparing YOLOv5 and DETR (Vision Transformer) models on the Pascal VOC 2012 dataset.

## Features

- **Real-time Training Monitoring**: WebSocket-based live training metrics
- **Interactive Inference**: Upload images and get instant object detection results
- **AI Assistant**: Powered by Ollama for intelligent insights and explanations
- **Comprehensive Metrics**: Per-class AP, precision-recall curves, performance comparisons
- **Professional UI**: Dark mode, glassmorphism effects, smooth animations

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite for fast development
- TailwindCSS + shadcn/ui components
- React Query for data fetching
- Recharts for visualizations
- Framer Motion for animations

**Backend:**
- FastAPI with WebSocket support
- PyTorch + YOLOv5 + DETR (Transformers)
- Ollama AI integration
- Pascal VOC 2012 dataset

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- CUDA-capable GPU (recommended)
- Ollama installed and running

### Installation

**Frontend:**
```bash
cd Frontendl
npm install
npm run dev
```

The app will be available at `http://localhost:8080`

**Backend:**
```bash
cd web_app/backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

**Ollama Setup:**
```bash
# Install Ollama from https://ollama.ai
ollama pull llama3.2:3b
ollama serve
```

## Project Structure

```
├── Frontendl/              # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # API utilities
│   │   └── types/          # TypeScript types
├── web_app/
│   └── backend/            # FastAPI backend
│       ├── models/         # YOLOv5 & DETR wrappers
│       ├── evaluation/     # Metrics calculation
│       └── main.py         # API endpoints
├── data_pipeline/          # VOC dataset parsing
└── training/               # Training scripts
```

## Development

**Run tests:**
```bash
# Frontend
cd Frontendl
npm run test

# Backend
cd web_app/backend
pytest
```

**Build for production:**
```bash
cd Frontendl
npm run build
```

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

## License

MIT License - see LICENSE file for details
