<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>AI News Chatbot</title>

  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #0f172a;
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }

    .chat-container {
      width: 90%;
      max-width: 800px;
      height: 90vh;
      background: #1e293b;
      border-radius: 15px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 0 20px rgba(0,0,0,0.3);
    }

    .header {
      padding: 20px;
      background: #111827;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
    }

    .chat-box {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }

    .message {
      margin-bottom: 15px;
      padding: 12px;
      border-radius: 10px;
      line-height: 1.5;
      max-width: 80%;
    }

    .user {
      background: #2563eb;
      margin-left: auto;
    }

    .bot {
      background: #334155;
    }

    .input-area {
      display: flex;
      padding: 15px;
      background: #111827;
    }

    input {
      flex: 1;
      padding: 14px;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      outline: none;
    }

    button {
      margin-left: 10px;
      padding: 14px 20px;
      border: none;
      border-radius: 10px;
      background: #2563eb;
      color: white;
      cursor: pointer;
      font-size: 16px;
    }

    button:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>

<div class="chat-container">
  <div class="header">📰 AI News Chatbot</div>

  <div class="chat-box" id="chatBox"></div>

  <div class="input-area">
    <input type="text" id="userInput" placeholder="Ask about latest news..." />
    <button onclick="sendMessage()">Send</button>
  </div>
</div>

<script>
  // =========================
  // API KEYS
  // =========================

  const NEWS_API_KEY = "YOUR_NEWS_API_KEY";
  const CLAUDE_API_KEY = "YOUR_ANTHROPIC_API_KEY";

  // =========================
  // CHAT UI
  // =========================

  const chatBox = document.getElementById("chatBox");

  function addMessage(text, sender) {
    const msg = document.createElement("div");
    msg.classList.add("message", sender);
    msg.innerText = text;
    chatBox.appendChild(msg);

    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // =========================
  // FETCH NEWS
  // =========================

  async function fetchNews(query) {
    try {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=5&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.articles || data.articles.length === 0) {
        return "No recent news found.";
      }

      let newsText = "";

      data.articles.forEach((article, index) => {
        newsText += `
${index + 1}. ${article.title}
Description: ${article.description || "No description"}
Source: ${article.source.name}
URL: ${article.url}

`;
      });

      return newsText;

    } catch (error) {
      console.error(error);
      return "Error fetching news.";
    }
  }

  // =========================
  // ASK CLAUDE
  // =========================

  async function askClaude(userQuestion, newsData) {

    const prompt = `
You are a helpful AI news assistant.

User Question:
${userQuestion}

Latest News:
${newsData}

Give a clear and helpful answer based on the news above.
`;

    try {

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        })
      });

      const data = await response.json();

      return data.content[0].text;

    } catch (error) {
      console.error(error);
      return "Error communicating with Claude API.";
    }
  }

  // =========================
  // MAIN CHAT FUNCTION
  // =========================

  async function sendMessage() {

    const input = document.getElementById("userInput");
    const userText = input.value.trim();

    if (!userText) return;

    addMessage(userText, "user");

    input.value = "";

    addMessage("Fetching latest news...", "bot");

    // Get News
    const newsData = await fetchNews(userText);

    // Ask Claude
    const aiReply = await askClaude(userText, newsData);

    // Remove loading message
    chatBox.removeChild(chatBox.lastChild);

    // Show AI response
    addMessage(aiReply, "bot");
  }

  // ENTER KEY SUPPORT
  document.getElementById("userInput")
    .addEventListener("keypress", function(event) {
      if (event.key === "Enter") {
        sendMessage();
      }
    });

</script>

</body>
</html>
