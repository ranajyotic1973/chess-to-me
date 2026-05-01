# Ollama Performance Optimization Guide

## Problem
The local Ollama service with qwen3:8b model is responding slowly or not responding at all.

## Diagnosis Steps

### 1. Check Ollama Service Status
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Should return a list of available models. If this fails, Ollama is not running.
```

### 2. Check Model Loading
```bash
# Check if qwen3:8b is loaded in memory
curl http://localhost:11434/api/tags | grep qwen3

# Try a simple test request
curl http://localhost:11434/api/chat -H "Content-Type: application/json" \
  -d '{"model":"qwen3:8b","messages":[{"role":"user","content":"Hi"}],"stream":false}'
```

### 3. Monitor System Resources
```bash
# Check CPU usage
Get-Process | Where-Object {$_.ProcessName -like "*ollama*"} | Format-Table Name, CPU

# Check memory (Windows)
Get-Process | Where-Object {$_.ProcessName -like "*ollama*"} | Format-Table Name, WorkingSet
```

### 4. Review Ollama Logs
```bash
# Windows: Check Ollama logs directory
# Typically at: %APPDATA%\ollama\logs

# Look for errors about memory, context size, or model loading issues
```

## Common Issues and Solutions

### Issue 1: Model Not in Memory (First Request is Slow)
**Symptom**: First request takes 30+ seconds, subsequent requests are faster

**Solution**: Model loads into GPU/CPU memory on first request. This is normal but slow.
- Pre-load model: `ollama pull qwen3:8b`
- Keep Ollama running in the background
- Use application's auto-fetch FEN feature which caches results for 30 seconds

### Issue 2: Context Window Exceeded
**Symptom**: Requests hang or timeout silently

**Solution**: The application now automatically:
- Estimates context size before sending
- Truncates analysis lines if context exceeds 6000 tokens
- Logs context size for debugging

Check the logs in the Chat panel for messages like: "context truncated" or context token counts.

### Issue 3: Ollama Process Unresponsive
**Symptom**: Ollama doesn't respond even to simple requests

**Solution**:
```bash
# Restart Ollama service
# Windows: Kill the process and restart
Stop-Process -Name "ollama*" -Force
# Then start Ollama again
```

### Issue 4: Insufficient Memory
**Symptom**: System slows down during requests, Ollama gets killed

**Solution**:
- Reduce `analysisDepth` setting (smaller analysis uses less memory)
- Use a smaller model: `ollama pull llama2:7b` instead of qwen3:8b
- Ensure system has at least 8GB RAM available
- Reduce the number of analysis lines requested (currently max 4)

### Issue 5: GPU Memory Issues (if using GPU)
**Symptom**: CUDA errors or GPU out of memory

**Solution**:
```bash
# Run Ollama with CPU instead of GPU
set CUDA_VISIBLE_DEVICES=-1
# or in PowerShell:
$env:CUDA_VISIBLE_DEVICES = "-1"
```

## Performance Tuning

### Reduce Context Size
The application now includes automatic context optimization:
- Analysis lines are truncated if context exceeds 6000 tokens
- Notation guide is included in system prompt (adds ~200 tokens)
- Each analysis line adds ~100-200 tokens

To further reduce context:
1. Reduce number of analysis lines (currently 4, could reduce to 2)
2. Simplify system prompt (currently ~800 tokens)
3. Use shorter FEN notation (only position, ignore move counts)

### Optimize Model Selection
```bash
# Fast models (good for real-time, smaller context):
ollama pull phi:2.5b           # 2.5B params, ~5GB memory
ollama pull llama2:7b          # 7B params, ~5GB memory

# Balanced models:
ollama pull mistral:7b         # 7B params, faster than qwen3
ollama pull neural-chat:7b     # 7B params, optimized for chat

# Large models (better quality, slower):
ollama pull qwen3:8b           # 8B params, ~6GB memory (current)
ollama pull llama2:13b         # 13B params, ~8GB memory
```

### Timeout Configuration
The application sets a default timeout of 60 seconds for LLM requests. If this is too short:
- Check logs for "timed out" messages
- Increase timeout in electron/main.js: `runOllamaChat(..., timeoutMs = 90000)`
- Verify Ollama is responsive

## Monitoring and Debugging

The application logs all LLM operations. Check the Chat panel logs for:
- `LLM request: <model> (~<tokens> tokens)` - request sent with context size
- `LLM response received` - successful response
- `LLM request timed out` - request exceeded timeout
- `context truncated` - context was too large and simplified

## Recommended Settings for Performance

For fastest performance with qwen3:8b:
```
analysisDepth: 10-12 (instead of 16)
ollamaModel: qwen3:8b (current, good balance)
System: Ensure 8GB+ RAM available
```

For best quality with acceptable performance:
```
analysisDepth: 16 (current)
ollamaModel: qwen3:8b (current)
System: Ensure 12GB+ RAM available
```

## Testing Performance

Run these commands to test Ollama responsiveness:

```bash
# Test 1: Simple response (should complete in <5 seconds)
curl http://localhost:11434/api/chat -H "Content-Type: application/json" \
  -d '{"model":"qwen3:8b","messages":[{"role":"user","content":"What is 2+2?"}],"stream":false}' -m 10

# Test 2: Longer context (should complete in <15 seconds)
$context = "In the opening: e2-e4 e7-e5 g1-f3 b8-c6... Evaluate the position."
curl http://localhost:11434/api/chat -H "Content-Type: application/json" \
  -d "{\"model\":\"qwen3:8b\",\"messages\":[{\"role\":\"user\",\"content\":\"$context\"}]}" -m 30
```

If Test 1 takes >5 seconds, Ollama needs attention.
If Test 2 takes >30 seconds, consider reducing context size.

## Next Steps

1. Run the diagnostics above and note response times
2. Check available system memory
3. Adjust analysisDepth if needed
4. Review application logs for context size warnings
5. Monitor performance after implementing optimization

For persistent issues, consider switching to a faster model or running Ollama on a machine with more GPU memory.
