/**
 * AWS Bedrock Service
 * Provides AI-powered cricket coaching and assistance using Claude via AWS Bedrock
 */

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface BedrockResponse {
  message: string;
  tokens: {
    input: number;
    output: number;
  };
  stopReason?: string;
}

interface FileData {
  name: string;
  type: string;
  fileType: string;
  data: string;
}

interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

// Type for AWS SDK imports (loaded dynamically)
type BedrockRuntimeClient = any;
type InvokeModelCommand = any;

class BedrockService {
  private client: BedrockRuntimeClient | null = null;
  public initialized: boolean = false;
  public region: string = 'us-east-1';
  public modelId: string = 'anthropic.claude-3-sonnet-20240229-v1:0';
  private conversationHistory: Message[] = [];
  private systemPrompt: string;
  private InvokeModelCommand: any = null;

  constructor() {
    // Get current date for context
    const currentDate = new Date();
    const dateString = currentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    this.systemPrompt = `You are an expert cricket coach and analyst with extensive knowledge of:
- Batting techniques (grip, stance, footwork, shot selection)
- Bowling techniques (pace, spin, variations, line and length)
- Fielding strategies and positions
- Cricket rules and regulations (ICC laws)
- Match strategies for all formats (Test, ODI, T20)
- Fitness and training for cricketers
- Video analysis and biomechanics
- Mental preparation and game psychology

IMPORTANT CONTEXT:
- Current date: ${dateString}
- Current year: ${currentDate.getFullYear()}
- Provide information that is current and up-to-date
- When discussing recent matches, tournaments, or players, use knowledge from 2024-2025
- If asked about current events, acknowledge the timeframe you're operating in

Provide helpful, accurate, and encouraging advice. Use cricket terminology appropriately and explain complex concepts clearly. Keep responses concise but informative.`;
  }

  /**
   * Initialize AWS Bedrock client
   */
  async initialize(accessKeyId: string, secretAccessKey: string, region: string = 'us-east-1'): Promise<boolean> {
    try {
      // Import AWS SDK v3 modules lazily to avoid bundling issues
      const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');

      this.region = region;

      const credentials = {
        accessKeyId,
        secretAccessKey
      };

      this.client = new BedrockRuntimeClient({
        region: this.region,
        credentials
      });
      this.InvokeModelCommand = InvokeModelCommand;

      this.initialized = true;
      console.log('AWS Bedrock initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize AWS Bedrock:', error);
      this.initialized = false;
      throw new Error(
        `Bedrock initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}. Ensure @aws-sdk/client-bedrock-runtime is installed (npm i @aws-sdk/client-bedrock-runtime).`
      );
    }
  }

  /**
   * Send a message to Claude via AWS Bedrock
   */
  async sendMessage(userMessage: string, includeHistory: boolean = true): Promise<BedrockResponse> {
    if (!this.client) {
      throw new Error('Bedrock client not initialized. Call initialize() first.');
    }

    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Prepare messages for Claude
      const messages = includeHistory
        ? this.conversationHistory
        : [{ role: 'user', content: userMessage }];

      // Prepare request payload for Claude 3
      const requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2048,
        system: this.systemPrompt,
        messages: messages,
        temperature: 0.7,
        top_p: 0.9
      };

      // Invoke Bedrock model
      const command = new this.InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: new TextEncoder().encode(JSON.stringify(requestBody))
      });

      const response = await this.client.send(command);

      // Parse response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Extract assistant's message
      const assistantMessage = responseBody.content[0].text;

      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage
      });

      return {
        message: assistantMessage,
        tokens: {
          input: responseBody.usage?.input_tokens || 0,
          output: responseBody.usage?.output_tokens || 0
        },
        stopReason: responseBody.stop_reason
      };
    } catch (error) {
      console.error('Bedrock invocation error:', error);
      throw new Error(`Failed to get response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get cricket technique advice
   */
  async getCricketAdvice(question: string, uploadedFiles: FileData[] = []): Promise<BedrockResponse> {
    // Fallback response when AWS Bedrock is not configured
    if (!this.initialized || !this.client) {
      return {
        message: `I'm currently running in basic mode without AWS Bedrock. To get AI-powered responses, please configure your AWS credentials in settings.

However, I can still help! For cricket questions, I recommend:
- For technique questions: Practice with a coach and record your sessions
- For rules: Check the official ICC cricket laws
- For strategies: Watch professional matches and analyze tactics
- For fitness: Consult a sports physiotherapist

Your question: "${question}"

Configure AWS Bedrock in settings to get detailed AI-powered answers!`,
        tokens: { input: 0, output: 0 }
      };
    }

    const formattedQuestion = `As a cricket coach, please answer this question: ${question}`;
    return await this.sendMessage(formattedQuestion);
  }

  /**
   * Analyze cricket technique from description
   */
  async analyzeTechnique(description: string, action: string = 'batting'): Promise<BedrockResponse> {
    const prompt = `Based on this ${action} description: "${description}"

Please provide:
1. Technical analysis of the described action
2. Key strengths identified
3. Areas for improvement
4. Specific drills to practice
5. Pro player comparison if applicable

Keep the response structured and actionable.`;

    return await this.sendMessage(prompt);
  }

  /**
   * Get match strategy advice
   */
  async getMatchStrategy(situation: string, format: string = 'T20'): Promise<BedrockResponse> {
    const prompt = `Match Format: ${format}
Situation: ${situation}

As a cricket strategist, provide tactical advice including:
1. Recommended approach
2. Field placements
3. Bowling/batting strategies
4. Risk assessment
5. Alternative options`;

    return await this.sendMessage(prompt);
  }

  /**
   * Explain cricket rules
   */
  async explainRule(rule: string): Promise<BedrockResponse> {
    const prompt = `Please explain the cricket rule/law regarding: ${rule}

Include:
1. Official rule explanation
2. Common scenarios where it applies
3. Examples from professional cricket
4. Common misconceptions`;

    return await this.sendMessage(prompt);
  }

  /**
   * Get fitness advice for cricketers
   */
  async getFitnessAdvice(area: string = 'general'): Promise<BedrockResponse> {
    const prompt = `Provide fitness and training advice for cricketers focusing on: ${area}

Include:
1. Specific exercises
2. Training schedule recommendations
3. Injury prevention tips
4. Nutrition advice
5. Recovery strategies`;

    return await this.sendMessage(prompt);
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): Message[] {
    return [...this.conversationHistory];
  }

  /**
   * Set model parameters
   */
  setModelId(modelId: string): void {
    this.modelId = modelId;
  }

  /**
   * Get available Claude models on Bedrock
   */
  getAvailableModels(): ModelInfo[] {
    return [
      {
        id: 'anthropic.claude-3-sonnet-20240229-v1:0',
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance and speed'
      },
      {
        id: 'anthropic.claude-3-opus-20240229-v1:0',
        name: 'Claude 3 Opus',
        description: 'Most capable, best for complex analysis'
      },
      {
        id: 'anthropic.claude-3-haiku-20240307-v1:0',
        name: 'Claude 3 Haiku',
        description: 'Fastest, good for quick responses'
      }
    ];
  }

  /**
   * Check if Bedrock is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Test connection to Bedrock
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.sendMessage('Hello, this is a test message. Please respond with "Connection successful!"', false);
      return response.message.toLowerCase().includes('connection') ||
        response.message.toLowerCase().includes('successful') ||
        response.message.length > 0;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const bedrockService = new BedrockService();

export default bedrockService;
