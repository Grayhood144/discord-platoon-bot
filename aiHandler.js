const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Store conversation history for each user
const conversationHistory = new Map();

// Maximum number of messages to keep in history
const MAX_HISTORY = 10;

// Function to manage conversation history
function updateConversationHistory(userId, message, response) {
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }
  
  const history = conversationHistory.get(userId);
  history.push(
    { role: 'user', content: message },
    { role: 'assistant', content: response }
  );
  
  // Keep only the last MAX_HISTORY messages
  while (history.length > MAX_HISTORY * 2) {
    history.shift();
  }
  
  conversationHistory.set(userId, history);
}

// Function to get conversation history
function getConversationHistory(userId) {
  return conversationHistory.get(userId) || [];
}

// Function to clear conversation history
function clearConversationHistory(userId) {
  conversationHistory.delete(userId);
}

// Main function to handle AI conversations
async function handleAIConversation(message, mentionedBot) {
  try {
    // Remove the bot mention from the message
    const userMessage = message.content.replace(/<@!?\d+>/g, '').trim();
    
    // Get conversation history
    const history = getConversationHistory(message.author.id);
    
    // Create messages array for API call
    const messages = [
      { 
        role: 'system', 
        content: 'You are a helpful and friendly AI assistant in a Discord server. ' +
                 'You can engage in casual conversation while maintaining a professional demeanor. ' +
                 'Keep responses concise and relevant. If asked about sensitive topics, ' +
                 'politely decline to discuss them.'
      },
      ...history,
      { role: 'user', content: userMessage }
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 150,
      temperature: 0.7,
      presence_penalty: 0.6
    });

    const response = completion.choices[0].message.content;
    
    // Update conversation history
    updateConversationHistory(message.author.id, userMessage, response);
    
    return response;

  } catch (error) {
    console.error('Error in AI conversation:', error);
    return "I apologize, but I'm having trouble processing your request right now. Please try again later.";
  }
}

// Function to check if message should trigger AI response
function shouldRespondToMessage(message, client) {
  // Respond if the bot is mentioned
  const botMention = message.mentions.users.has(client.user.id);
  
  // Don't respond to bot messages
  if (message.author.bot) return false;
  
  return botMention;
}

module.exports = {
  handleAIConversation,
  shouldRespondToMessage,
  clearConversationHistory
}; 