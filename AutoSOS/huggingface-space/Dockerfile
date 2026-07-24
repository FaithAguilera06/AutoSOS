# Hugging Face Space Dockerfile for AutoSOS YOLOv8
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgtk-3-0 \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libv4l-dev \
    libxvidcore-dev \
    libx264-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Create directories and copy the model
RUN mkdir -p /app/models /app/cache/hub /app/cache/matplotlib /app/cache/ultralytics && \
    chmod -R 777 /app/cache
COPY best.pt /app/models/best.pt

# Expose port
EXPOSE 7860

# Set environment variables
ENV PYTHONPATH=/app
ENV HF_HOME=/app/cache
ENV TRANSFORMERS_CACHE=/app/cache/hub
ENV MPLCONFIGDIR=/app/cache/matplotlib
ENV YOLO_CONFIG_DIR=/app/cache/ultralytics
ENV FONTCONFIG_PATH=/etc/fonts

# Run the application
CMD ["python", "app.py"]
