# Python Import Error in Dockerized Data Store Service

## The Issue

When running the data_store service in Docker, we encountered the following import error:

```
data_store-1  | Traceback (most recent call last):
data_store-1  |   File "/usr/local/bin/python: Error while finding module specification for 'data_store.app' (ModuleNotFoundError: No module named 'data_store')
```

Later, after changing the import approach:

```
data_store-1  | CWD: /app
data_store-1  | sys.path: ['/app', '/usr/local/lib/python310.zip', '/usr/local/lib/python3.10', '/usr/local/lib/python3.10/lib-dynload', '/usr/local/lib/python3.10/site-packages']
data_store-1  | Traceback (most recent call last):
data_store-1  |   File "/app/app.py", line 16, in <module>
data_store-1  |     from api import data_store_api
data_store-1  |   File "/app/api.py", line 18, in <module>
data_store-1  |     from . import create_data_store, create_data_store_from_url
data_store-1  | ImportError: attempted relative import with no known parent package
```

## Root Cause

The error occurs because:

1. Python only allows relative imports (e.g., `from .module import something`) when a file is run as part of a package.
2. When running a Python file directly (e.g., `python app.py`), it's treated as the `__main__` module, not as part of a package.
3. In our Docker setup, the files are copied to `/app` and run directly, not as part of an installed package.

## Attempted Solutions

### Attempt 1: Run as a Module with Relative Imports

```dockerfile
# Set WORKDIR to the parent directory
WORKDIR /app

# Run as a module
CMD ["python", "-m", "data_store.app"]
```

**Result**: Failed with `ModuleNotFoundError: No module named 'data_store'`

### Attempt 2: Install as a Package with setup.py

Created a setup.py file:
```python
from setuptools import setup, find_packages

setup(
    name="data_store",
    version="0.1.0",
    packages=find_packages(),
)
```

And installed it:
```dockerfile
# Install the data_store module in development mode
RUN uv pip install --system -e .
```

**Result**: Failed with the same import error.

### Attempt 3: Set PYTHONPATH and Use Absolute Imports in app.py

```dockerfile
# Set PYTHONPATH to include the current directory
ENV PYTHONPATH=/app

# Run the app directly
CMD ["python", "data_store/app.py"]
```

Changed app.py:
```python
# From
from data_store.api import data_store_api
# To
from api import data_store_api
```

**Result**: Failed with error in api.py which was still using relative imports.

### Attempt 4: Use Absolute Imports in api.py

Changed api.py:
```python
# From
from . import create_data_store, create_data_store_from_url
# To
from factory import create_data_store, create_data_store_from_url
```

**Result**: Pending testing.

## Lessons Learned

1. **Docker Context Matters**: The build context and WORKDIR in Docker determine how Python imports work.
2. **Avoid Relative Imports in Containerized Apps**: Relative imports are problematic in containerized environments where files are often run directly.
3. **Use Absolute Imports**: When possible, use absolute imports that are relative to the PYTHONPATH.
4. **Debug with Print Statements**: Adding `print(os.getcwd())` and `print(sys.path)` helped diagnose the issue.

## Best Practices for Python Imports in Docker

1. **Use Absolute Imports**: Prefer `from package.module import something` over `from .module import something`.
2. **Set PYTHONPATH Explicitly**: Include the root directory in PYTHONPATH.
3. **Install as a Package**: For complex applications, install the code as a package.
4. **Use __main__.py**: For package execution, consider using a `__main__.py` file.

## References

- [Python Modules Documentation](https://docs.python.org/3/tutorial/modules.html)
- [Relative Imports in Python](https://realpython.com/absolute-vs-relative-python-imports/)
- [Python Packaging User Guide](https://packaging.python.org/en/latest/tutorials/packaging-projects/)