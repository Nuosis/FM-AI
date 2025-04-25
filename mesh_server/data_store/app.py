#!/usr/bin/env python3
"""
Data Store Service Entry Point

This script serves as the entry point for the Data Store service.
It creates a Flask application and registers the data_store_api blueprint.
"""

from flask import Flask
import os, sys
import logging
print("CWD:", os.getcwd())
print("sys.path:", sys.path)

# Import the data_store_api blueprint
from api import data_store_api

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('data-store-service')

# Create the Flask application
app = Flask(__name__)

# Register the data_store_api blueprint
app.register_blueprint(data_store_api, url_prefix="/api/data-store")

# Add a health check endpoint
@app.route('/api/data-store/health', methods=['GET'])
def health_check():
    return {"status": "healthy", "service": "data-store"}, 200

if __name__ == "__main__":
    # Get the port from the environment or use the default
    port = int(os.environ.get("PORT", 3550))
    
    # Log the startup
    logger.info(f"Starting Data Store service on port {port}")
    
    # Run the application
    app.run(host="0.0.0.0", port=port, debug=True)