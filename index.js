const express = require('express');
const { chromium } = require('playwright');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/get-odds-link', async (req, res) => {
  const home = req.query.home?.trim();
  const away = req.query.away?.trim();

  if (!home || !away) {
    return res.status(400).json({ error: 'Missing home or away team name' });
  }

  try {
    const link = await getOddsLink(home, away);
    if (link) {
      res.json({ oddsLink: link });
    } else {
      res.status(404).json({ error: 'Match not found' });
    }
  } catch (err) {
    console.error('Scraping error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function getOddsLink(homeTeam, awayTeam) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.totalcorner.com/match/today', { waitUntil: 'networkidle' });

  const matchRows = await page.$$('.table-main tbody tr');

  for (const row of matchRows) {
    const matchEl = await row.$('td:nth-child(2) a');
    const matchText = await matchEl?.innerText();
    if (!matchText) continue;

    const normalizedMatch = matchText.toLowerCase().replace(/\s+/g, ' ').trim();
    const expectedMatch = `${homeTeam.toLowerCase().trim()} vs ${awayTeam.toLowerCase().trim()}`;

    if (normalizedMatch === expectedMatch) {
      const oddsLinkEl = await row.$('td:nth-child(5) a');
      const oddsHref = await oddsLinkEl?.getAttribute('href');
      await browser.close();
      return oddsHref ? 'https://www.totalcorner.com' + oddsHref : null;
    }
  }

  await browser.close();
  return null;
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
