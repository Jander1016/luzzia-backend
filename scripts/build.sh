#!/bin/bash

# ============================================
# 🏗️ Build Script - Luzzia Backend
# ============================================

set -e

echo "🚀 Building Luzzia Backend..."

# Variables
IMAGE_NAME="luzzia-backend"
TAG="${1:-latest}"
DOCKERFILE="${2:-Dockerfile}"

echo "📦 Building image: $IMAGE_NAME:$TAG"
echo "📄 Using Dockerfile: $DOCKERFILE"

# Build con optimizaciones
docker build \
  --file $DOCKERFILE \
  --tag $IMAGE_NAME:$TAG \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --progress=plain \
  .

echo "✅ Build completed successfully!"
echo "🎯 Image: $IMAGE_NAME:$TAG"

# Mostrar información de la imagen
echo ""
echo "📊 Image Information:"
docker images $IMAGE_NAME:$TAG --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

echo ""
echo "🔍 Image layers:"
docker history $IMAGE_NAME:$TAG --human --format "table {{.CreatedBy}}\t{{.Size}}"