## Example Clients

Three demo clients are included in the `examples/` directory:

```bash
# Direct API client (stdlib only — no Node.js required, works in Colab)
python3 examples/direct_api_client.py

# MCP stdio clients (require Node.js + npm install)
node examples/node_client.js
python3 examples/python_client.py
```

### Google Colab Notebook

A Jupyter notebook demonstrating an AI agent that writes blog posts using SkinGuide:

```
examples/blogcreation.ipynb
```

**Features:**
- Runs natively in Google Colab
- Uses LangChain + LangGraph to create an autonomous agent
- Bridges MCP server stdio with OpenAI GPT-4o for real-time product research
- Generates Markdown blog posts with real skincare recommendations

**Usage:**
1. Open the notebook in [Google Colab](https://colab.research.google.com/)
2. Add your `OPENAI_API_KEY` to Colab Secrets
3. Clone/mount the repo and run cells sequentially
4. Modify the `user_topic` variable to generate custom blog posts

---
