#!/usr/bin/env bash
# Convenience script to bootstrap the backend for the first time.
set -e

echo "==> Creating virtual environment..."
python -m venv .venv

echo "==> Activating virtual environment..."
# Windows: .\.venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
source .venv/Scripts/activate 2>/dev/null || source .venv/bin/activate

echo "==> Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Copying .env..."
[ -f .env ] || cp .env.example .env

echo "==> Running migrations..."
python manage.py migrate

echo "==> Creating superuser (skip with Ctrl+C if not needed)..."
python manage.py createsuperuser

echo ""
echo "✅  Setup complete. Start the server with:"
echo "    python manage.py runserver"
