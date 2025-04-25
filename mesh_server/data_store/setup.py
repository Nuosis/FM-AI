from setuptools import setup, find_packages

setup(
    name="data_store",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "flask>=2.0.0",
        "requests>=2.25.0",
        "psycopg2-binary>=2.9.0",
        "lancedb>=0.3.0",
        "pyarrow>=12.0.0",
    ],
)