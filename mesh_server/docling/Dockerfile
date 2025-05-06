FROM python:3.10-slim

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install uv and use it to install dependencies
RUN pip install --no-cache-dir uv
RUN uv pip install --system --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Make sure the utils directory is recognized as a package
RUN touch utils/__init__.py

# Create directory for temporary files
RUN mkdir -p /app/temp
VOLUME /app/temp

# Expose the port the app runs on
EXPOSE 3600

# Environment variables
ENV LLM_PROXY_URL=http://proxy:3500

# Command to run the application
CMD ["python", "api.py", "--port", "3600", "--host", "0.0.0.0"]