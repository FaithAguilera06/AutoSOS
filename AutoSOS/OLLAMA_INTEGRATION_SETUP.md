# Ollama Integration Setup Guide

This guide explains how to set up and use Ollama with the AutoSOS chat diagnostic feature.

## Prerequisites

1. **Ollama Installation**: Install Ollama on your system
   - Windows: Download from [ollama.ai](https://ollama.ai)
   - macOS: `brew install ollama`
   - Linux: `curl -fsSL https://ollama.ai/install.sh | sh`

2. **Model Installation**: Install a suitable model for motorcycle diagnostics
   ```bash
   # Recommended lightweight model for mobile
   ollama pull llama3.2:3b
   
   # Alternative models
   ollama pull llama3.2:7b    # More detailed responses
   ollama pull llama3.2:1b    # Fastest responses
   ```

## Setup Instructions

### 1. Start Ollama Service

```bash
# Start Ollama service (runs on localhost:11434 by default)
ollama serve
```

### 2. Verify Installation

```bash
# List available models
ollama list

# Test a model
ollama run llama3.2:3b "Hello, can you help with motorcycle diagnostics?"
```

### 3. Configure AutoSOS

The AutoSOS app is already configured to connect to Ollama at `localhost:11434`. No additional configuration is needed.

## Features

### AI-Powered Diagnostics
- **Intelligent Analysis**: Ollama provides context-aware motorcycle diagnostic responses
- **Structured Output**: Responses include issue identification, severity levels, and actionable recommendations
- **Safety Warnings**: Critical safety issues are highlighted prominently
- **Follow-up Questions**: AI suggests relevant follow-up questions for better diagnosis

### Model Management
- **Model Selection**: Choose from available Ollama models
- **Real-time Switching**: Change models without restarting the app
- **Model Status**: Visual indicators show which model is active

### Fallback System
- **Graceful Degradation**: Falls back to rule-based responses if Ollama is unavailable
- **Connection Retry**: Automatic retry mechanism for connection issues
- **Error Handling**: User-friendly error messages and recovery options

## Usage

### 1. Access Chat Diagnostic
1. Open AutoSOS app
2. Navigate to Diagnostic → AI Chatbot Diagnostic
3. Check the status indicator in the header

### 2. Status Indicators
- **Green "Ollama AI Active"**: Ollama is connected and ready
- **Yellow Warning**: Ollama unavailable, using fallback responses
- **Settings Icon**: Click to change AI model

### 3. Model Selection
1. Click the settings icon in the header
2. Select from available models
3. Confirm selection

### 4. Diagnostic Process
1. Describe your motorcycle problem in detail
2. AI analyzes the issue and provides:
   - Problem identification
   - Severity assessment
   - Immediate actions
   - Long-term solutions
   - Safety warnings (if applicable)
   - Follow-up questions

## Troubleshooting

### Common Issues

#### Ollama Not Starting
```bash
# Check if Ollama is running
ollama list

# Restart Ollama service
ollama serve
```

#### Model Not Found
```bash
# Install the default model
ollama pull llama3.2:3b

# Or install a different model
ollama pull llama3.2:7b
```

#### Connection Refused
- Ensure Ollama is running on port 11434
- Check firewall settings
- Verify no other service is using the port

#### Slow Responses
- Use a smaller model (llama3.2:1b) for faster responses
- Ensure adequate system resources
- Close other resource-intensive applications

### Performance Optimization

#### For Mobile Devices
- Use `llama3.2:1b` or `llama3.2:3b` models
- Ensure device has sufficient RAM (4GB+ recommended)
- Close background applications

#### For Desktop
- Use `llama3.2:7b` for more detailed responses
- Ensure GPU acceleration is enabled if available
- Monitor system resources

## Advanced Configuration

### Custom Models
You can use custom fine-tuned models for motorcycle diagnostics:

```bash
# Create a custom model (example)
ollama create custom-motorcycle-diagnostic -f Modelfile
```

### API Configuration
The service connects to `http://localhost:11434` by default. To change this:

1. Edit `src/app/services/ollama.service.ts`
2. Update the `baseUrl` property
3. Rebuild the application

### Prompt Engineering
The diagnostic prompt is optimized for motorcycle issues. To customize:

1. Edit the `buildDiagnosticPrompt` method in `ollama.service.ts`
2. Modify the prompt template for your specific needs
3. Test with various scenarios

## Security Considerations

- Ollama runs locally, keeping your data private
- No data is sent to external services
- All diagnostic conversations remain on your device
- Models are downloaded and run locally

## Support

### Getting Help
- Check Ollama documentation: [ollama.ai/docs](https://ollama.ai/docs)
- AutoSOS GitHub issues for app-specific problems
- Community forums for model recommendations

### Reporting Issues
When reporting issues, include:
- Ollama version
- Model being used
- System specifications
- Error messages
- Steps to reproduce

## Future Enhancements

Planned features:
- Voice input support
- Image analysis integration
- Multi-language support
- Custom model training
- Cloud deployment options
- Integration with repair manuals
- Parts recommendation system

---

**Note**: This integration requires Ollama to be running locally. For production deployment, consider setting up Ollama on a server and updating the API endpoint accordingly.
