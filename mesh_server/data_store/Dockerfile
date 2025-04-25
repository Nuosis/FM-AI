FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first
COPY requirements.txt .

# Install uv and use it to install dependencies
RUN pip install --no-cache-dir uv
RUN uv pip install --system --no-cache-dir -r requirements.txt

# Copy the data_store module
COPY . .

# Install the data_store module in development mode
RUN uv pip install --system -e .

# Create directory for data
RUN mkdir -p /app/data
VOLUME /app/data

# Expose the port the app runs on
EXPOSE 3550

# Environment variables
ENV DATABASE_URL=""

# Make the entry point script executable
RUN chmod +x app.py

# Run the app directly
CMD ["python", "app.py"]