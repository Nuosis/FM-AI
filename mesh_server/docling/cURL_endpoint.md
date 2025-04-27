# /test
```curl
curl -X POST \
  http://localhost:3600/docling/test \
  -H "Content-Type: application/json" \
  -d '{"user_id": "a68163bf-94f4-4a2d-99a0-22fb60ec5028"}'
```

#/llm
```curl
curl -X POST \
  http://localhost:3500/llm \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "type": "tokenize",
    "model": "gpt-4.1",
    "text": "Hello, this is a test."
  }'
```