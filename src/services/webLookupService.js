function cleanText(value, max = 900) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

async function fetchDuckDuckGo(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) throw new Error(`DuckDuckGo request failed (${response.status}).`);
  return response.json();
}

async function fetchWikipediaSummary(query) {
  const openSearchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json`;
  const searchResponse = await fetch(openSearchUrl, { method: "GET" });
  if (!searchResponse.ok) return null;
  const searchData = await searchResponse.json().catch(() => null);
  const title = Array.isArray(searchData?.[1]) ? searchData[1][0] : "";
  if (!title) return null;

  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const summaryResponse = await fetch(summaryUrl, { method: "GET" });
  if (!summaryResponse.ok) return null;
  const summary = await summaryResponse.json().catch(() => null);
  if (!summary?.extract) return null;
  return {
    title: summary.title || title,
    summary: cleanText(summary.extract, 1100),
    url: summary?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`
  };
}

async function lookupWeb(query) {
  const value = cleanText(query, 300);
  if (!value) throw new Error("Web lookup query is required.");

  const ddg = await fetchDuckDuckGo(value).catch(() => null);
  const heading = cleanText(ddg?.Heading || value, 120);
  const abstractText = cleanText(ddg?.AbstractText || "", 1100);
  const abstractUrl = cleanText(ddg?.AbstractURL || "", 500);

  const topics = [];
  const related = Array.isArray(ddg?.RelatedTopics) ? ddg.RelatedTopics : [];
  for (const item of related) {
    if (topics.length >= 3) break;
    if (Array.isArray(item?.Topics)) {
      for (const sub of item.Topics) {
        if (topics.length >= 3) break;
        const text = cleanText(sub?.Text || "", 220);
        if (text) topics.push(text);
      }
      continue;
    }
    const text = cleanText(item?.Text || "", 220);
    if (text) topics.push(text);
  }

  if (abstractText) {
    return {
      title: heading,
      summary: abstractText,
      sourceUrl: abstractUrl || ""
    };
  }

  const wiki = await fetchWikipediaSummary(value);
  if (wiki) {
    return {
      title: wiki.title,
      summary: wiki.summary,
      sourceUrl: wiki.url
    };
  }

  if (topics.length) {
    return {
      title: heading,
      summary: topics.join("\n"),
      sourceUrl: abstractUrl || ""
    };
  }

  throw new Error("No web results found.");
}

module.exports = { lookupWeb };
