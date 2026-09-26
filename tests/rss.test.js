import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RSSAggregator, stripHtml, feedIdFromUrl, clampLimit, formatItems, mapLimit } from '../build/index.js';

function writeTemp(name, content) {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rss-test-')), name);
  fs.writeFileSync(p, content);
  return p;
}

test('stripHtml removes markup, decodes entities and truncates', () => {
  assert.equal(stripHtml('<p>hello <b>world</b></p>'), 'hello world');
  assert.equal(stripHtml('it&#x27;s &amp; more'), "it's & more");
  assert.equal(stripHtml(undefined), undefined);
  assert.equal(stripHtml('   <br/>  '), undefined);
  const long = stripHtml('x'.repeat(400));
  assert.equal(long.length, 280);
  assert.ok(long.endsWith('…'));
});

test('feedIdFromUrl is a stable slug', () => {
  assert.equal(feedIdFromUrl('https://news.ycombinator.com/rss'), 'news-ycombinator-com');
  assert.equal(feedIdFromUrl('https://www.theverge.com/rss/index.xml'), 'theverge-com');
  assert.equal(feedIdFromUrl('not a url'), 'not-a-url');
});

test('clampLimit stays inside the advertised range', () => {
  assert.equal(clampLimit(undefined, 15, 50), 15);
  assert.equal(clampLimit(1000, 15, 50), 50);
  assert.equal(clampLimit(0, 15, 50), 1);
  assert.equal(clampLimit('x', 15, 50), 15);
});

test('OPML parsing keeps nested categories', () => {
  const opml = writeTemp('f.opml', `<?xml version="1.0"?><opml version="2.0"><body>
    <outline text="Tech" title="Tech">
      <outline title="A" type="rss" xmlUrl="https://a.example.com/rss" htmlUrl="https://a.example.com"/>
      <outline title="B" type="rss" xmlUrl="https://b.example.com/rss"/>
    </outline>
    <outline text="Sci" title="Sci">
      <outline title="C" type="rss" xmlUrl="https://c.example.com/rss"/>
    </outline></body></opml>`);
  const agg = new RSSAggregator(opml);
  assert.equal(agg.size, 3);
  assert.deepEqual(agg.getCategories(), ['Sci', 'Tech']);
  assert.equal(agg.getFeed('a-example-com').category, 'Tech');
  assert.equal(agg.getFeed('c-example-com').category, 'Sci');
  assert.match(agg.listFeeds(), /feed_id: a-example-com/);
});

test('JSON feed lists are supported', () => {
  const json = writeTemp('f.json', JSON.stringify([{ title: 'A', url: 'https://a.example.com/rss', category: 'X' }]));
  const agg = new RSSAggregator(json);
  assert.equal(agg.size, 1);
  assert.equal(agg.getFeed('a-example-com').title, 'A');
});

test('a missing RSS_FEEDS_PATH falls back to the bundled sample list', () => {
  const agg = new RSSAggregator('/nope/does-not-exist.opml');
  assert.ok(agg.size > 0);
  assert.equal(agg.source, 'bundled sample feed list');
});

test('unknown feed id is rejected by name', async () => {
  const agg = new RSSAggregator('/nope/does-not-exist.opml');
  await assert.rejects(() => agg.getFeedItems('nope', 5), /not found/);
});

test('an unmatched category names the available ones instead of dividing by zero', async () => {
  const agg = new RSSAggregator('/nope/does-not-exist.opml');
  await assert.rejects(() => agg.getLatest(10, 'nonexistent-category'), /Available categories/);
});

test('formatItems reports feeds that failed rather than hiding them', () => {
  const out = formatItems(
    [{ title: 'T', link: 'https://x/1', isoDate: '2026-01-01T00:00:00.000Z', source: 'S', sourceUrl: 'https://x' }],
    'Title',
    ['Broken: timeout']
  );
  assert.match(out, /# Title/);
  assert.match(out, /1\. T/);
  assert.match(out, /Broken: timeout/);
  assert.match(formatItems([], 'Empty', ['A: down']), /No feed could be read/);
});

test('mapLimit runs everything while bounding concurrency', async () => {
  let inFlight = 0, peak = 0;
  const results = await mapLimit([...Array(20).keys()], 4, async (n) => {
    inFlight++; peak = Math.max(peak, inFlight);
    await new Promise(r => setTimeout(r, 5));
    inFlight--;
    if (n === 7) throw new Error('boom');
    return n * 2;
  });
  assert.equal(results.length, 20);
  assert.ok(peak <= 4, `peak concurrency was ${peak}`);
  assert.equal(results[7].status, 'rejected');
  assert.equal(results[3].value, 6);
});
