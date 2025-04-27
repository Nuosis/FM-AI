# /llm
```curl
curl -X POST http://localhost:3500/llm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNjgxNjNiZi05NGY0LTRhMmQtOTlhMC0yMmZiNjBlYzUwMjgiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20ifQ.YOUR_SIGNATURE_HERE" \
  -d '{
    "provider": "openai",
    "type": "chat",
    "model": "gpt-4",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Hello, how are you today?"
      }
    ]
  }'
```