# Competitor Analysis

## Current screen

`/competition` provides the information architecture for:

- editable own inventory-turnover, inventory, and sell-through inputs;
- TOP10 benchmark cards;
- competitor selection with focus procurement area;
- financial and news source slots.

The values currently shown are labelled development sample data. Sell-through is not inferred from financial data. It is marked as unavailable until external sales data exists.

## Production adapter requirements

1. Create a competitor master with company name, securities code, corporate number, fiscal year, and original source URLs.
2. Map EDINET XBRL facts to revenue, cost of sales, operating profit, inventory, sale inventory, work in progress, and development inventory.
3. Store fiscal period and unit for every fact.
4. Keep inferred focus regions separate from reported facts.
5. Store news publication date, company, category, title, summary, original URL, and fetched timestamp.
