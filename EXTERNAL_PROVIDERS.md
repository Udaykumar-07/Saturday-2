# External AI Providers

Saturday can connect to external AI providers for advanced reasoning, multi-step tasks, and complex document analysis. This document explains how to configure and use external AI providers while maintaining your privacy and control.

## Supported Providers

Saturday supports the following external AI providers:

### OpenAI
- **GPT-4**: Advanced reasoning and analysis
- **GPT-4o**: Faster GPT-4 with vision capabilities
- **o1**: Extended reasoning for complex problem-solving

### Anthropic Claude
- **Claude 3.5 Sonnet**: Fast, balanced performance for most tasks
- **Claude 3 Opus**: Maximum capability for demanding tasks

### Google Gemini
- **Gemini 1.5 Pro**: High-capability model with long context
- **Gemini 1.5 Flash**: Fast, cost-effective model

## How to Get API Keys

Each provider requires an API key for authentication. Follow these steps to obtain your API keys:

### OpenAI
1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key immediately (it won't be shown again)
5. Paste it into Saturday's External AI Providers settings

### Anthropic
1. Visit [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Sign in or create an account
3. Navigate to API Keys section
4. Click "Create Key"
5. Copy the key and paste it into Saturday

### Google Gemini
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it into Saturday

## Cost Implications

External AI providers charge based on token usage. Tokens are chunks of text—roughly 4 characters or 0.75 words each.

### Approximate Costs (per 1,000 tokens)

**OpenAI:**
- GPT-4: $0.03 input / $0.06 output
- GPT-4o: $0.0025 input / $0.01 output
- o1-preview: $0.015 input / $0.06 output

**Anthropic:**
- Claude 3.5 Sonnet: $0.003 input / $0.015 output
- Claude 3 Opus: $0.015 input / $0.075 output

**Google Gemini:**
- Gemini 1.5 Pro: $0.00125 input / $0.005 output
- Gemini 1.5 Flash: $0.000075 input / $0.00030 output

### Example Usage Costs

A typical conversation message (100 words input, 200 words output):
- GPT-4o: ~$0.003
- Claude 3.5 Sonnet: ~$0.004
- Gemini 1.5 Pro: ~$0.001

For detailed pricing, see:
- [OpenAI Pricing](https://openai.com/pricing)
- [Anthropic Pricing](https://www.anthropic.com/pricing)
- [Google AI Pricing](https://ai.google.dev/pricing)

## Privacy Considerations

### Data Transmission
When you use external AI providers, your conversation messages are sent to the provider's servers for processing. Saturday only sends the necessary conversation context—it never transmits:
- Your stored memories or preferences (unless explicitly mentioned in your message)
- Your device information
- Your location data
- Files or data from other apps

### Provider Data Policies
Each provider has its own data retention and privacy policy:

- **OpenAI**: Messages are not used to train models. Data retention: 30 days (as of 2024).
- **Anthropic**: Does not train on user data. Logs retained for trust & safety purposes.
- **Google Gemini**: Subject to Google AI privacy policy. Consult their terms for details.

Saturday recommends reviewing each provider's privacy policy before connecting:
- [OpenAI Privacy Policy](https://openai.com/privacy)
- [Anthropic Privacy Policy](https://www.anthropic.com/privacy)
- [Google AI Privacy Policy](https://support.google.com/gemini/answer/13594961)

### Key Security
Your API keys are stored securely:
- **Android Keystore**: Keys are encrypted using hardware-backed Android Keystore (via `expo-secure-store`)
- **Never logged**: Saturday never logs or transmits your API keys
- **Local only**: Keys never leave your device except when authenticating with the provider

## Configuration

### Step-by-Step Setup

1. **Open Saturday Settings**
   - Tap the Settings icon in the top-right corner of the home screen

2. **Navigate to External AI Providers**
   - Scroll to the "External AI Providers" section (below Connected Services)

3. **Select a Provider**
   - Tap "Connect" on the provider you want to configure (OpenAI, Anthropic, or Google Gemini)

4. **Paste Your API Key**
   - Paste your API key into the secure text input field
   - Tap "Get your API key from [Provider]" if you need to obtain one

5. **Test Connection** (Optional but Recommended)
   - Tap "Test Connection" to verify your API key is valid
   - Wait for the success or error message

6. **Save**
   - Tap "Save" to securely store your API key
   - The provider will now appear as "Connected"

### Disconnecting a Provider

1. Open Saturday Settings > External AI Providers
2. Find the connected provider
3. Tap "Disconnect"
4. Your API key will be removed from secure storage

## Troubleshooting

### Common Errors and Solutions

#### "Invalid API key"
**Problem**: The API key you entered is not recognized by the provider.

**Solutions**:
- Double-check that you copied the entire key (no extra spaces or missing characters)
- Verify the key hasn't been revoked or expired in your provider's dashboard
- For OpenAI: Ensure your account has billing set up
- Regenerate a new API key from the provider's console

#### "Rate limit exceeded"
**Problem**: You've exceeded the provider's usage limits for your account tier.

**Solutions**:
- Wait a few minutes before trying again
- Check your provider's dashboard for rate limit details
- Upgrade your provider account tier if needed
- Saturday will automatically fall back to local AI when possible

#### "Network error connecting to [provider]"
**Problem**: Saturday couldn't reach the provider's servers.

**Solutions**:
- Check your internet connection
- Verify you're not behind a restrictive firewall or VPN
- Wait a moment and try again (provider may be experiencing downtime)
- Check the provider's status page for service issues
- Saturday will fall back to local AI if available

#### "Test Connection" fails but key looks correct
**Problem**: API key appears valid but connection test fails.

**Solutions**:
- Ensure your provider account has billing configured (most providers require payment info even for free tier)
- Check if there are IP or geographic restrictions on your API key
- Wait a few minutes—newly created keys may take time to activate
- Try regenerating the API key in your provider dashboard

### Getting Help

If you continue experiencing issues:
1. Check the provider's official documentation and status page
2. Verify your account standing and billing status with the provider
3. Try disconnecting and reconnecting the provider in Saturday
4. Use Saturday's local AI as a reliable fallback

## Best Practices

### Cost Management
- Use local AI for simple queries and local phone actions
- Reserve external AI for complex reasoning, analysis, and multi-step tasks
- Monitor your usage and costs in each provider's dashboard
- Set up billing alerts with your provider to avoid unexpected charges

### Privacy & Security
- Never share your API keys with anyone
- Regularly rotate API keys (generate new ones and update Saturday)
- Disconnect providers you're not actively using
- Review your provider's data retention policies periodically

### Performance
- Local AI is instant and works offline—prefer it when possible
- External providers add network latency (~1-2 seconds per message)
- Saturday automatically falls back to local AI if external providers fail
- Test your connection after configuration to ensure it works before you need it
