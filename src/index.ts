#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import Parser from 'rss-parser';
import { XMLParser } from 'fast-xml-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_OPML_PATH = path.join(__dirname, '../public/sample-feeds.opml');

/**
 * Feed list source. Set RSS_FEEDS_PATH to an .opml or .json file to use your own
 * subscriptions; otherwise the bundled sample list is used.
 *
 * Earlier versions read claude_desktop_config.json to find this path. That file holds
 * every other MCP server's API keys, so this server no longer opens it.
 */
const FEEDS_PATH_ENV = 'RSS_FEEDS_PATH';
const FETCH_CONCURRENCY = 8;

interface Feed {
  id: string;
  title: string;
  url: string;
  htmlUrl?: string;
  category: string;
}

interface FeedItem {
  title: string;
  link: string;
  isoDate: string;
  snippet?: string;
  creator?: string;
  source: string;
  sourceUrl: string;
}

/** Run tasks with a bounded number in flight; an OPML import can hold hundreds of feeds. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { status: 'fulfilled', value: await fn(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

function stripHtml(text: string | undefined, maxLength = 280): string | undefined {
  if (!text) return undefined;
  const clean = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return undefined;
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean;
}

function feedIdFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').replace(/\./g, '-');
  } catch {
    return url.replace(/https?:\/\//g, '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  }
}

class RSSAggregator {
  private feeds = new Map<string, Feed>();
  private parser = new Parser({
    timeout: 15000,
    headers: { 'User-Agent': 'mcp-rss-aggregator (+https://github.com/imprvhub/mcp-rss-aggregator)' },
    customFields: { item: [['dc:creator', 'creator']] },
  });
  private xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  /** Where the feed list came from, so `rss_list` can say so. */
  readonly source: string;

  constructor(feedsPath = process.env[FEEDS_PATH_ENV]) {
    if (feedsPath && fs.existsSync(feedsPath)) {
      this.loadFromFile(feedsPath);
      this.source = feedsPath;
    } else {
      if (feedsPath) console.error(`${FEEDS_PATH_ENV} is set to "${feedsPath}" but no such file exists; using the sample feed list.`);
      this.loadFromFile(SAMPLE_OPML_PATH);
      this.source = 'bundled sample feed list';
    }
  }

  private loadFromFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.opml' || ext === '.xml') this.parseOPML(content);
    else if (ext === '.json') this.parseJSON(content);
    else throw new Error(`Unsupported feed list format "${ext}"; use .opml or .json`);
    if (this.feeds.size === 0) throw new Error(`No feeds found in ${filePath}`);
    console.error(`Loaded ${this.feeds.size} feeds from ${filePath}`);
  }

  private addFeed(title: string, url: string, htmlUrl: string | undefined, category: string) {
    const id = feedIdFromUrl(url);
    this.feeds.set(id, { id, title, url, htmlUrl, category: category || 'Uncategorized' });
  }

  private parseOPML(content: string) {
    const parsed = this.xmlParser.parse(content);
    const body = parsed?.opml?.body;
    if (!body?.outline) throw new Error('Invalid OPML: no <body><outline> found');

    const walk = (outline: any, category: string) => {
      if (Array.isArray(outline)) {
        outline.forEach(entry => walk(entry, category));
        return;
      }
      const label = outline['@_title'] || outline['@_text'] || '';
      if (outline['@_xmlUrl']) {
        this.addFeed(label || 'Unnamed Feed', outline['@_xmlUrl'], outline['@_htmlUrl'], category);
      }
      // A node can both point at a feed and nest others, so recurse regardless.
      if (outline.outline) walk(outline.outline, label || category);
    };
    walk(body.outline, '');
  }

  private parseJSON(content: string) {
    const entries = JSON.parse(content);
    if (!Array.isArray(entries)) throw new Error('JSON feed list must be an array of {title, url, category?}');
    for (const entry of entries) {
      if (!entry?.url) continue;
      this.addFeed(entry.title || 'Unnamed Feed', entry.url, entry.htmlUrl, entry.category || '');
    }
  }

  get size(): number {
    return this.feeds.size;
  }

  getFeed(id: string): Feed | undefined {
    return this.feeds.get(id);
  }

  getCategories(): string[] {
    return [...new Set([...this.feeds.values()].map(f => f.category))].sort();
  }

  listFeeds(): string {
    const byCategory = new Map<string, Feed[]>();
    for (const feed of this.feeds.values()) {
      if (!byCategory.has(feed.category)) byCategory.set(feed.category, []);
      byCategory.get(feed.category)!.push(feed);
    }
    const lines = [`${this.feeds.size} feeds from ${this.source}:`, ''];
    for (const category of [...byCategory.keys()].sort()) {
      lines.push(`${category}:`);
      for (const feed of byCategory.get(category)!.sort((a, b) => a.title.localeCompare(b.title))) {
        lines.push(`  - ${feed.title} (feed_id: ${feed.id})`);
      }
      lines.push('');
    }
    lines.push(`Set ${FEEDS_PATH_ENV} to an .opml or .json file to use your own subscriptions.`);
    return lines.join('\n');
  }

  async getFeedItems(feedId: string, limit: number): Promise<FeedItem[]> {
    const feed = this.feeds.get(feedId);
    if (!feed) throw new Error(`Feed '${feedId}' not found. Use rss_list to see available feed ids.`);
    const parsed = await this.parser.parseURL(feed.url);
    return (parsed.items || []).slice(0, limit).map(item => ({
      title: item.title || 'No title',
      link: item.link || '',
      isoDate: item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : ''),
      snippet: stripHtml(item.contentSnippet || item.content),
      creator: (item as any).creator || undefined,
      source: feed.title,
      sourceUrl: feed.htmlUrl || feed.url,
    }));
  }

  /**
   * Newest items across feeds. Each feed is asked for `limit` items and the merged
   * list is trimmed, so one busy feed cannot crowd out the rest — the previous
   * version divided the limit by the feed count, which returned one item per feed.
   */
  async getLatest(limit: number, category?: string): Promise<{ items: FeedItem[]; failures: string[] }> {
    const selected = [...this.feeds.values()].filter(
      feed => !category || feed.category.toLowerCase().includes(category.toLowerCase())
    );
    if (selected.length === 0) {
      throw new Error(
        `No feeds match category '${category}'. Available categories: ${this.getCategories().join(', ')}`
      );
    }

    const results = await mapLimit(selected, FETCH_CONCURRENCY, feed => this.getFeedItems(feed.id, limit));
    const items: FeedItem[] = [];
    const failures: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') items.push(...result.value);
      else failures.push(`${selected[index].title}: ${result.reason instanceof Error ? result.reason.message : result.reason}`);
    });

    items.sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());
    return { items: items.slice(0, limit), failures };
  }
}

function formatItems(items: FeedItem[], title: string, failures: string[] = []): string {
  if (items.length === 0) {
    const note = failures.length ? `\n\nNo feed could be read:\n- ${failures.join('\n- ')}` : '';
    return `No articles found.${note}`;
  }
  const lines = [`# ${title}`, ''];
  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.title}`);
    lines.push(`   Source: ${item.source}${item.creator ? ` — ${item.creator}` : ''}`);
    if (item.isoDate) lines.push(`   Published: ${item.isoDate}`);
    lines.push(`   Link: ${item.link}`);
    if (item.snippet) lines.push(`   ${item.snippet}`);
    lines.push('');
  });
  if (failures.length) lines.push(`(${failures.length} feed(s) could not be read: ${failures.join('; ')})`);
  return lines.join('\n').trimEnd();
}

const aggregator = new RSSAggregator();

const server = new Server(
  { name: 'mcp-rss-aggregator', version: '0.2.0' },
  { capabilities: { tools: {} } }
);

const limitProp = (max: number, def: number) => ({
  type: 'number' as const,
  description: `Number of articles to return (1-${max}, default: ${def})`,
  minimum: 1,
  maximum: max,
  default: def,
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'rss_list',
      description: 'List the configured RSS feeds, grouped by category, with the feed_id to use with rss_feed',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'rss_latest',
      description: 'Get the newest articles across all configured RSS feeds, most recent first, optionally limited to one category',
      inputSchema: {
        type: 'object',
        properties: {
          limit: limitProp(50, 15),
          category: {
            type: 'string',
            description: 'Optional category to filter by, e.g. "Tech News" or "Science". Use rss_list to see categories.',
          },
        },
      },
    },
    {
      name: 'rss_feed',
      description: 'Get the newest articles from one specific RSS feed',
      inputSchema: {
        type: 'object',
        properties: {
          feed_id: { type: 'string', description: 'Feed id as reported by rss_list, e.g. "news-ycombinator-com"' },
          limit: limitProp(50, 10),
        },
        required: ['feed_id'],
      },
    },
  ],
}));

function clampLimit(value: unknown, fallback: number, max: number): number {
  const n = typeof value === 'number' ? Math.floor(value) : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 1), max);
}

const text = (body: string) => ({ content: [{ type: 'text', text: body }] });

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    if (name === 'rss_list') return text(aggregator.listFeeds());

    if (name === 'rss_latest') {
      const limit = clampLimit(args?.limit, 15, 50);
      const category = typeof args?.category === 'string' && args.category.trim() ? args.category.trim() : undefined;
      const { items, failures } = await aggregator.getLatest(limit, category);
      return text(formatItems(items, category ? `Latest ${limit} articles in ${category}` : `Latest ${limit} articles`, failures));
    }

    if (name === 'rss_feed') {
      const feedId = typeof args?.feed_id === 'string' ? args.feed_id.trim() : '';
      if (!feedId) throw new Error('feed_id is required; use rss_list to see available feed ids');
      const limit = clampLimit(args?.limit, 10, 50);
      const items = await aggregator.getFeedItems(feedId, limit);
      return text(formatItems(items, `Latest ${items.length} articles from ${items[0]?.source || feedId}`));
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    console.error('Error handling request:', error);
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP RSS Aggregator server running on stdio');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
  });
}

export { RSSAggregator, stripHtml, feedIdFromUrl, clampLimit, formatItems, mapLimit };
