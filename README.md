# MCP RSS Aggregator

An integration that allows Claude Desktop to fetch and read content from your favorite RSS feeds using the Model Context Protocol (MCP).

## Features

- Read articles from your favorite RSS feeds directly in Claude Desktop
- Support for OPML files to import your existing feed subscriptions
- Organize feeds by categories
- Get the latest articles across all your feeds
- Filter articles by feed source or category
- Well-formatted article presentation with titles, snippets, and links

## Requirements

- Node.js 16 or higher
- Claude Desktop
- Internet connection to access RSS feeds

## Installation

### Installing Manually
1. Clone or download this repository:
```bash
git clone https://github.com/imprvhub/mcp-rss-aggregator
cd mcp-rss-aggregator
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Feed Configuration

The RSS Aggregator supports both OPML and JSON formats for feed configuration.

### Using OPML (Recommended)

OPML (Outline Processor Markup Language) is a standard format used by most RSS readers to export and import feed subscriptions. 

A sample OPML file with popular feeds is included in the `public/sample-feeds.opml` file. You can:

1. Use this file as-is
2. Edit it to add your own feeds
3. Replace it with an export from your existing RSS reader

Most RSS readers allow you to export your subscriptions as an OPML file.

### Using JSON

Alternatively, you can define your feeds in a JSON file with the following format:

```json
[
  {
    "title": "Hacker News",
    "url": "https://news.ycombinator.com/rss",
    "htmlUrl": "https://news.ycombinator.com/",
    "category": "Tech News"
  },
  {
    "title": "TechCrunch",
    "url": "https://techcrunch.com/feed/",
    "htmlUrl": "https://techcrunch.com/",
    "category": "Tech News"
  }
]
```

## Running the MCP Server

There are two ways to run the MCP server:

### Option 1: Running manually

1. Open a terminal or command prompt
2. Navigate to the project directory
3. Run the server directly:

```bash
node build/index.js
```

Keep this terminal window open while using Claude Desktop. The server will run until you close the terminal.

### Option 2: Auto-starting with Claude Desktop (recommended for regular use)

The Claude Desktop can automatically start the MCP server when needed. To set this up:

#### Configuration

The Claude Desktop configuration file is located at:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Edit this file to add the RSS Aggregator MCP configuration. If the file doesn't exist, create it:

```json
{
  "mcpServers": {
    "rssAggregator": {
      "command": "node",
      "args": ["ABSOLUTE_PATH_TO_DIRECTORY/mcp-rss-aggregator/build/index.js"],
      "feedsPath": "ABSOLUTE_PATH_TO_YOUR_FEEDS_FILE.opml"
    }
  }
}
```

**Important Notes**: 
- Replace `ABSOLUTE_PATH_TO_DIRECTORY` with the **complete absolute path** where you installed the MCP
  - macOS/Linux example: `/Users/username/mcp-rss-aggregator`
  - Windows example: `C:\\Users\\username\\mcp-rss-aggregator`
- Replace `ABSOLUTE_PATH_TO_YOUR_FEEDS_FILE.opml` with the path to your OPML or JSON file
  - If omitted, the sample feeds file will be used

If you already have other MCPs configured, simply add the "rssAggregator" section inside the "mcpServers" object:

```json
{
  "mcpServers": {
    "otherMcp1": {
      "command": "...",
      "args": ["..."]
    },
    "rssAggregator": {
      "command": "node",
      "args": [
        "ABSOLUTE_PATH_TO_DIRECTORY/mcp-rss-aggregator/build/index.js"
      ],
      "feedsPath": "ABSOLUTE_PATH_TO_YOUR_FEEDS_FILE.opml"
    }
  }
}
```

The MCP server will automatically start when Claude Desktop needs it, based on the configuration in your `claude_desktop_config.json` file.

## Usage

1. Restart Claude Desktop after modifying the configuration
2. In Claude, use the `rss` command to interact with the RSS Aggregator MCP Server
3. The MCP server runs as a subprocess managed by Claude Desktop

## Available Commands

The RSS Aggregator MCP provides a tool named `rss` with several commands:

| Command | Description | Parameters | Example |
|---------|-------------|------------|---------|
| `latest` | Show latest articles from all feeds | Optional limit (--N) | `rss latest --20` |
| `top` or `best` | Show top articles from all feeds | Optional limit (--N) | `rss top --15` |
| `list` | List all available feeds | None | `rss list` |
| `--[feed-id]` | Show articles from a specific feed | Optional limit (--N) | `rss --hackernews --10` |
| `[category]` | Show articles from a specific category | Optional limit (--N) | `rss "Tech News" --20` |
| `set-feeds-path --[path]` | Set path to OPML/JSON file | Path to file | `rss set-feeds-path --/path/to/feeds.opml` |

## Example Usage

Here are various examples of how to use the RSS Aggregator with Claude:

### Direct Commands:

```
rss latest
rss top --20
rss list
rss "Tech News"
rss --hackernews
rss --techcrunch --15
```

### Natural Language Queries:

You can also interact with the MCP using natural language. Claude will interpret these requests and use the appropriate commands:

- "What are the latest news on Hacker News?"
- "Show me the top tech articles today"
- "Fetch the latest articles from my programming feeds"
- "List all my RSS feeds"

## Extended Usage Examples

### Daily News Briefing

Get your news briefing from all your sources:

```
rss latest --25
```

This will fetch the 25 most recent articles across all your feeds, giving you a quick overview of the latest news.

### Exploring Top Content

Find the most important or popular articles:

```
rss top --20
```

### Category-Based Reading

Focus on specific content categories:

```
rss "Tech News" --30
rss "Politics" --15
rss "Science" --10
```

### Source-Specific Updates

Read updates from specific sources you follow:

```
rss --hackernews --20
rss --nytimes
rss --techcrunch --15
```

### Discover Your Available Feeds

Find out what feeds you have configured:

```
rss list
```

### Combining Multiple Requests

You can make multiple sequential requests to build a comprehensive view:

```
rss "Tech News" --10
rss "Finance" --10
rss top --5
```

### Practical Workflows

1. **Morning Routine**:
   ```
   rss top --10
   rss "News" --5
   ```

2. **Industry Research**:
   ```
   rss "Industry News" --15
   rss --bloomberg --5
   ```

3. **Tech Updates**:
   ```
   rss --hackernews --10
   rss --techcrunch --5
   ```

### Working with Claude

You can ask Claude to analyze or summarize the articles:

1. After running: `rss latest --10`
   Ask: "Can you summarize these articles?"

2. After running: `rss "Tech News" --15`
   Ask: "What are the key trends in these tech articles?"

3. After running: `rss --nytimes --washingtonpost --10`
   Ask: "Compare how these sources cover current events"

## Troubleshooting

### "Server disconnected" error
If you see the error "MCP RSS Aggregator: Server disconnected" in Claude Desktop:

1. **Verify the server is running**:
   - Open a terminal and manually run `node build/index.js` from the project directory
   - If the server starts successfully, use Claude while keeping this terminal open

2. **Check your configuration**:
   - Ensure the absolute path in `claude_desktop_config.json` is correct for your system
   - Double-check that you've used double backslashes (`\\`) for Windows paths
   - Verify you're using the complete path from the root of your filesystem

### Tools not appearing in Claude
If the RSS Aggregator tools don't appear in Claude:
- Make sure you've restarted Claude Desktop after configuration
- Check the Claude Desktop logs for any MCP communication errors
- Ensure the MCP server process is running (run it manually to confirm)

### Feeds not loading
If your feeds aren't loading properly:
- Make sure your OPML/JSON file is correctly formatted
- Check if the `feedsPath` in your configuration is correct
- Try running the server manually with a known good feeds file

## Contributing

Contributions to improve the RSS Aggregator are welcome! Here are some ways you can contribute:

1. Add support for more feed formats
2. Improve feed parsing and error handling
3. Add more visualization options for articles
4. Improve categorization and filtering capabilities

## License

This project is licensed under the Mozilla Public License 2.0 - see the [LICENSE](https://github.com/imprvhub/mcp-rss-aggregator/blob/main/LICENSE) file for details.

## Related Links

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/download)