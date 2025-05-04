FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install --no-cache-dir uv

# Install Python dependencies using uv
RUN uv pip install --system --no-cache-dir \
    requests \
    anyio \
    git+https://github.com/modelcontextprotocol/python-sdk.git#egg=mcp

# Copy the MCP server code
COPY mesh_server.py .

# Make the server executable
RUN chmod +x mesh_server.py

# Run the MCP server
CMD ["python", "mesh_server.py", "--transport", "sse", "--port", "8001"]