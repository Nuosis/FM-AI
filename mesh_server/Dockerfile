FROM python:3.10-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install uv and use it to install dependencies
RUN pip install --no-cache-dir uv
RUN uv pip install --system --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create directory for data
RUN mkdir -p /app/data
VOLUME /app/data

# Expose the port the app runs on
EXPOSE 3500

# Environment variables
ENV JWT_SECRET=""
ENV SUPABASE_URL=""
ENV SUPABASE_SERVICE_ROLE_KEY=""

# Command to run the application
CMD ["python", "llm-proxy.py", "--port", "3500", "--host", "0.0.0.0", "--enable-auth", "--debug"]