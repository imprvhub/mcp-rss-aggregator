# MCP RSS Aggregator
[![Trust Score](https://archestra.ai/mcp-catalog/api/badge/quality/imprvhub/mcp-rss-aggregator)](https://archestra.ai/mcp-catalog/imprvhub__mcp-rss-aggregator)
[![Smithery](https://img.shields.io/badge/Smithery-imprvhub%2Fmcp--rss--aggregator-8A2BE2)](https://smithery.ai/server/imprvhub/mcp-rss-aggregator)

<table style="border-collapse: collapse; width: 100%; table-layout: fixed;">
<tr>
<td style="padding: 15px; vertical-align: middle; border: none; text-align: center;">
  <a href="https://mseep.ai/app/imprvhub-mcp-rss-aggregator">
    <img src="https://mseep.net/pr/imprvhub-mcp-rss-aggregator-badge.png" alt="MseeP.ai Security Assessment Badge" />
  </a>
</td>
<td style="width: 40%; padding: 15px; vertical-align: middle; border: none;">An integration that allows Claude Desktop to fetch and read content from your favorite RSS feeds using the Model Context Protocol (MCP).</td>
<td style="width: 60%; padding: 0; vertical-align: middle; border: none; min-width: 300px; text-align: center;"><a href="https://glama.ai/mcp/servers/@imprvhub/mcp-rss-aggregator">
  <img style="max-width: 100%; height: auto; min-width: 300px;" src="https://glama.ai/mcp/servers/@imprvhub/mcp-rss-aggregator/badge" alt="RSS Aggregator MCP server" />
</a></td>
</tr>
</table>

## Features

- Read articles from your favorite RSS feeds directly in Claude Desktop
- Support for OPML files to import your existing feed subscriptions
- Organize feeds by categories
- Get the latest articles across all your feeds
- Filter articles by feed source or category
- Well-formatted article presentation with titles, snippets, and links
- Feeds are read and formatted locally; no article content leaves your machine

## Demo

<p>
  <a href="https://youtu.be/9pvm078fHkQ">
    <img src="public/assets/preview.png" width="600" alt="RSS Aggregator MCP Demo">
  </a>
</p>

<details>
<summary> Timestamps </summary>

Click on any timestamp to jump to that section of the video

[00:00](https://youtu.be/9pvm078fHkQ&t=0s) - **Sample RSS Feed Demonstration**:
Using the default 'sample-feeds.opml' file included in the repository. This segment displays how Claude processes and presents news content from sources like TechCrunch, The Verge, and other technology publications through the MCP (Model Context Protocol).

[01:05](https://youtu.be/9pvm078fHkQ&t=65s) - **Configuration File Editing Process**:
Step-by-step walkthrough of accessing and modifying the claude_desktop_config.json file to change the OPML file path reference from the default sample to a customized 'my-feeds.opml' file.

[01:15](https://youtu.be/9pvm078fHkQ&t=75s) - **Application Restart Procedure**:
Illustrating the necessary step of closing and reopening the Claude Desktop application to properly load and apply the modified OPML file configuration changes.

[01:25](https://youtu.be/9pvm078fHkQ&t=85s) - **Custom RSS Feed Results**:
Demonstration of the results after implementing the custom OPML file. This section highlights the expanded and more diverse news sources now available through Claude Desktop, including Spanish-language content.
</details>

## Requirements

- Node.js 20 or higher
- Claude Desktop
- Internet connection to access RSS feeds

## Installation

### Installing via Smithery

Install the packaged bundle from the [Smithery server page](https://smithery.ai/server/imprvhub/mcp-rss-aggregator), or from the CLI:

```bash
npx -y @smithery/cli@latest mcp add imprvhub/mcp-rss-aggregator --client claude
```

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
      "env": {
        "RSS_FEEDS_PATH": "ABSOLUTE_PATH_TO_YOUR_FEEDS_FILE.opml"
      }
    }
  }
}
```

**Important Notes**: 
- Replace `ABSOLUTE_PATH_TO_DIRECTORY` with the **complete absolute path** where you installed the MCP
  - macOS/Linux example: `/Users/username/mcp-rss-aggregator`
  - Windows example: `C:\\Users\\username\\mcp-rss-aggregator`
- Replace `ABSOLUTE_PATH_TO_YOUR_FEEDS_FILE.opml` with the path to your OPML or JSON file
  - The whole `env` block is optional. Without it, the bundled sample feed list is used.

> **Changed in 0.2.0**: the feed list path is read from the `RSS_FEEDS_PATH` environment
> variable. Earlier versions took a non-standard `feedsPath` key, which the server found by
> opening `claude_desktop_config.json` itself — a file that also holds every other MCP
> server's API keys. This server no longer reads that file.

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
      "env": {
        "RSS_FEEDS_PATH": "ABSOLUTE_PATH_TO_YOUR_FEEDS_FILE.opml"
      }
    }
  }
}
```

The MCP server will automatically start when Claude Desktop needs it, based on the configuration in your `claude_desktop_config.json` file.

## Usage

1. Restart Claude Desktop after modifying the configuration
2. Ask Claude for your feeds in plain language; it will pick the right tool
3. The MCP server runs as a subprocess managed by Claude Desktop

## Available Tools

> **Changed in 0.2.0**: the single `rss` tool that took command strings (`rss latest --20`,
> `rss --hackernews`) has been replaced by three tools with real parameters. Claude no longer
> has to guess a command syntax, and the `set-feeds-path` command is gone — the feed list is
> configured with `RSS_FEEDS_PATH` rather than by a tool call that could read arbitrary files.

| Tool | Description | Parameters |
|------|-------------|------------|
| `rss_list` | List configured feeds grouped by category, with the `feed_id` for each | none |
| `rss_latest` | Newest articles across all feeds, most recent first | `limit`: 1-50 (default 15); `category`: optional |
| `rss_feed` | Newest articles from one feed | `feed_id`: required; `limit`: 1-50 (default 10) |

## Example Usage

Here are various examples of how to use the RSS Aggregator with Claude:

### Direct Tool Usage:

```
"Use rss_list to show my feeds"
"Use rss_latest with limit 20"
"Use rss_latest with category 'Tech News'"
"Use rss_feed with feed_id news-ycombinator-com and limit 10"
```

### Natural Language Queries:

You can also interact with the MCP using natural language. Claude will interpret these requests and use the appropriate commands:

- "What are the latest news on Hacker News?"
- "Show me the top tech articles today"
- "Fetch the latest articles from my programming feeds"
- "List all my RSS feeds"

## Extended Usage Examples

### Daily News Briefing

> "Give me the 25 latest articles across all my feeds and summarise the themes."

Claude calls `rss_latest` with `limit: 25`, then summarises.

### Category-Based Reading

> "What's new in Science today?"
> "Anything interesting in my Programming feeds?"

Claude calls `rss_latest` with the matching `category`.

### Source-Specific Updates

> "What's on the front page of Hacker News?"
> "Show me the last 15 TechCrunch posts."

Claude calls `rss_feed` with the feed's `feed_id` (see `rss_list`).

### Working with Claude

Because the articles come back as text in the conversation, you can follow up directly:

- "Summarise these articles."
- "Which of these are about AI?"
- "Compare how these sources cover the same story."

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
- Check that `RSS_FEEDS_PATH` points at an existing `.opml` or `.json` file. If the path does
  not exist the server logs a warning and falls back to the bundled sample list
- Try running the server manually with a known good feeds file
- `rss_list` reports which feed list it loaded, and `rss_latest` names any feed it could not read

## Development

Run the test suite (no network required):

```bash
npm install
npm run build
npm test
```

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
- [MCP Series](https://github.com/mcp-series)
