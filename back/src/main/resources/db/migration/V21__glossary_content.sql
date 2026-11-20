-- Glossary content (English). Definitions use [[slug|visible text]] for links to other terms
-- ([[slug]] alone shows the slug). Text is dollar-quoted ($$...$$), so apostrophes need no escaping.
-- Educational wording only: explain concepts, never recommend a product (MiFID II).
-- After editing this file locally run `make db-reset`.

INSERT INTO glossary_category (id, slug, name, position) VALUES
    (1, 'basics',        'Basics',        1),
    (2, 'investing',     'Investing',     2),
    (3, 'saving',        'Saving',        3),
    (4, 'credit-debt',   'Credit & debt', 4),
    (5, 'risk',          'Risk',          5);

INSERT INTO glossary_term
    (id, slug, name, full_name, category_id, position, short_description,
     definition_standard, definition_plain, example, aliases, graphic_key, lesson_id) VALUES

(1, 'inflation', 'Inflation', NULL, 1, 1,
 $$Prices rising over time, so each euro buys less$$,
 $$Inflation is the general rise in prices over time, which reduces the purchasing power of money. If inflation is 3% a year, something that costs € 100 today costs about € 103 next year. Money that earns less than inflation, for example cash in an account paying a lower [[interest-rate|interest rate]], loses value in real terms.$$,
 $$Inflation means things get more expensive over time. The same € 100 buys a little less each year. If your savings grow more slowly than prices, you can buy less with them later than you can today.$$,
 $$A coffee costs € 3.00 today. With 3% inflation it costs about € 3.09 next year and about € 4.03 in ten years.$$,
 ARRAY['rising prices','cost of living'], 'inflation-power', 3),

(2, 'interest-rate', 'Interest rate', NULL, 1, 2,
 $$The price of borrowing, or the reward for saving$$,
 $$An interest rate is the percentage a lender charges for lending money, or a bank pays you for holding your savings, usually quoted per year. It is the basis for [[compound-interest|compound interest]] and for the cost of credit (see [[apr|APR]]). Rates change with the economy and with [[inflation]].$$,
 NULL,
 $$A savings account pays 2.25% a year. On € 12,000 that is about € 270 in interest over twelve months.$$,
 ARRAY['rate','interest'], NULL, NULL),

(3, 'compound-interest', 'Compound interest', 'Interest on interest', 1, 3,
 $$Interest that earns interest on itself$$,
 $$Compound interest is interest calculated on both the original amount and the interest already added to it. Each period the base grows, so the interest you earn grows too. The longer the horizon and the higher the [[interest-rate|interest rate]], the stronger the effect.$$,
 $$With compound interest, the interest you earned also starts earning interest. Your money grows a little faster every year, like a snowball rolling downhill. Time matters most.$$,
 $$€ 1,000 at 5% a year becomes about € 1,630 after 10 years and € 4,320 after 30, with no extra deposits.$$,
 ARRAY['interest on interest','compounding'], 'compound-growth', 2),

(4, 'budget', 'Budget', NULL, 1, 4,
 $$A plan for what comes in and what goes out$$,
 $$A budget is a plan that compares your expected income with your expected spending over a period, usually a month. It shows how much is left over for your [[savings-rate|savings rate]] or an [[emergency-fund|emergency fund]].$$,
 NULL,
 $$Income € 2,150, fixed costs € 1,100, everyday spending € 700. That leaves € 350 for saving.$$,
 ARRAY['spending plan'], NULL, NULL),

(5, 'stock', 'Stock', NULL, 2, 1,
 $$A small ownership share in a company$$,
 $$A stock (also called a share) is a small piece of ownership in a company. Its price moves with the company's results and with market expectations, so it can rise or fall. Some companies pay part of their profit to owners as a [[dividend]]. The prices of many stocks tracked together form an [[index]].$$,
 NULL,
 $$If a company is split into 1,000,000 shares and you hold 100 of them, you own 0.01% of the company.$$,
 ARRAY['share','equity'], NULL, NULL),

(6, 'etf', 'ETF', 'Exchange-traded fund', 2, 2,
 $$A basket of many investments bought as one$$,
 $$An ETF (exchange-traded fund) is a fund that holds many [[stock|stocks]] or [[bond|bonds]] and is traded on an exchange like a single share. Because it spreads money across many holdings, it provides built-in [[diversification]]. Most ETFs track an [[index]], and some pay out a [[dividend]].$$,
 $$An ETF is a basket of many [[stock|stocks]] and [[bond|bonds]] that you buy as one share. Your money is spread across lots of companies, so one bad apple hurts less. That is [[diversification]]. Many ETFs simply copy an [[index]].$$,
 $$Put € 100 into a world-stock ETF and you own a tiny slice of thousands of companies at once. If one of them struggles, the others cushion the fall.$$,
 ARRAY['exchange traded fund','index fund','fund'], 'diversification', NULL),

(7, 'dividend', 'Dividend', NULL, 2, 3,
 $$A slice of profit paid out to shareholders$$,
 $$A dividend is a part of a company's profit that it pays out to its shareholders, usually once or twice a year. Companies are not obliged to pay one, and the amount can change or stop. It is one of the ways a [[stock]] can provide a return.$$,
 NULL,
 $$A company pays € 2 per share per year. If you hold 50 shares, you receive € 100 before any taxes.$$,
 ARRAY['payout','distribution'], NULL, NULL),

(8, 'diversification', 'Diversification', NULL, 2, 4,
 $$Spreading money so one bad result hurts less$$,
 $$Diversification means spreading money across many different investments, such as different companies, sectors, countries or asset types like [[stock|stocks]] and [[bond|bonds]]. If one holding falls, others may hold up or rise, which reduces the effect on the total. It lowers the impact of any single holding, but it does not remove market [[volatility]].$$,
 $$Do not put all your eggs in one basket. Diversification means spreading your money over many different things, so one bad result hurts less. An [[etf|ETF]] does this in one step.$$,
 $$Two portfolios of € 1,000: one holds a single company's shares, the other holds 500 companies. If one company loses half its value, the first portfolio loses € 500 and the second about € 1.$$,
 ARRAY['spreading risk'], 'diversification', NULL),

(9, 'bond', 'Bond', NULL, 2, 5,
 $$A loan you give to a government or a company$$,
 $$A bond is a loan that you give to a government or a company. The issuer promises to pay regular interest and to return the original amount on a set date. Bond prices can still change before that date, and the issuer may fail to pay.$$,
 NULL,
 $$A bond of € 1,000 pays 3% interest a year for 5 years: € 30 each year, then your € 1,000 back at the end.$$,
 ARRAY['debt security','government bond'], NULL, NULL),

(10, 'index', 'Index', NULL, 2, 6,
 $$A number that tracks a group of investments$$,
 $$An index measures how a chosen group of investments performs, for example the largest companies in a country. It is a statistic, not something you buy directly, but many [[etf|ETFs]] are built to follow one. Examples include the DAX and the S&P 500.$$,
 NULL,
 $$If an index of 40 companies moves from 10,000 to 10,500 points, the group has risen roughly 5%.$$,
 ARRAY['stock index','benchmark'], NULL, NULL),

(11, 'emergency-fund', 'Emergency fund', NULL, 3, 1,
 $$Cash set aside for the unexpected$$,
 $$An emergency fund is money kept in easily accessible savings to cover unexpected costs or a loss of income, such as a repair or a gap between jobs. A common guideline is to hold several months of essential expenses, adjusted to personal circumstances. It is kept separate from long-term investments so that it is available when needed. See also [[budget]].$$,
 $$An emergency fund is money you keep aside for surprises: a broken phone, a car repair, or a few weeks without income. It sits somewhere safe and easy to reach, not tied up in investments.$$,
 $$Essential costs are € 1,500 a month. A three-month cushion would be € 4,500.$$,
 ARRAY['rainy day fund','safety net','buffer'], NULL, 1),

(12, 'savings-rate', 'Savings rate', NULL, 3, 2,
 $$The share of income you put aside$$,
 $$The savings rate is the percentage of your income that you set aside instead of spending, calculated as savings divided by income over the same period. A higher rate leaves more for goals such as an [[emergency-fund|emergency fund]]. Do not confuse it with the [[interest-rate|interest rate]] paid on a savings account.$$,
 NULL,
 $$Income of € 2,150 a month and € 215 saved gives a savings rate of 10%.$$,
 ARRAY['saving rate'], NULL, NULL),

(13, 'apr', 'APR', 'Annual percentage rate', 4, 1,
 $$The yearly cost of a loan, fees included$$,
 $$APR (annual percentage rate) expresses the total yearly cost of borrowing as a percentage, including the [[interest-rate|interest rate]] and certain mandatory fees. It lets you compare loans on equal terms. Two loans with the same interest rate can have different APRs if their fees differ.$$,
 NULL,
 $$Loan A: 6.0% interest, no fees, APR 6.0%. Loan B: 5.8% interest plus fees, APR 6.4%. Loan B has the lower rate but costs more per year.$$,
 ARRAY['annual percentage rate','effective interest rate'], NULL, NULL),

(14, 'credit-score', 'Credit score', NULL, 4, 2,
 $$A number summarising how reliably you repay$$,
 $$A credit score is a number that credit agencies calculate from your borrowing and repayment history. Lenders use it to judge how likely you are to repay, which can affect whether you are approved and the [[interest-rate|interest rate]] you are offered. Paying on time and keeping debt moderate generally supports a higher score.$$,
 NULL,
 $$Missing several payments on a credit card can lower your score and make a later loan more expensive.$$,
 ARRAY['credit rating','schufa'], NULL, NULL),

(15, 'volatility', 'Volatility', NULL, 5, 1,
 $$How strongly a price moves up and down$$,
 $$Volatility measures how much and how quickly the price of an investment moves up and down. High volatility means large swings in both directions, low volatility means smaller ones. It describes uncertainty, not direction. [[stock|Stocks]] are usually more volatile than [[bond|bonds]].$$,
 NULL,
 $$A price that moves between € 95 and € 105 in a month is less volatile than one that moves between € 70 and € 130.$$,
 ARRAY['price swings','fluctuation'], NULL, NULL),

(16, 'risk-tolerance', 'Risk tolerance', NULL, 5, 2,
 $$How much ups and downs you can accept$$,
 $$Risk tolerance describes how large a temporary loss you could accept, financially and emotionally, without abandoning your plan. It depends on your goals, your time horizon and your finances, and it differs from person to person. Understanding it helps you make sense of [[volatility]] and [[diversification]].$$,
 NULL,
 $$Two people see their investment fall 20% in a month. One shrugs and waits, the other sleeps badly. Their risk tolerance differs.$$,
 ARRAY['risk appetite','risk profile'], NULL, NULL);

-- Related terms, in display order (position is 0-based).
INSERT INTO glossary_related (term_id, related_term_id, position) VALUES
 (1, 2, 0), (1, 3, 1), (1, 12, 2),
 (2, 3, 0), (2, 13, 1), (2, 1, 2),
 (3, 2, 0), (3, 1, 1), (3, 12, 2),
 (4, 11, 0), (4, 12, 1),
 (5, 6, 0), (5, 7, 1), (5, 10, 2), (5, 9, 3), (5, 15, 4),
 (6, 5, 0), (6, 9, 1), (6, 8, 2), (6, 10, 3), (6, 7, 4),
 (7, 5, 0), (7, 6, 1), (7, 10, 2),
 (8, 6, 0), (8, 5, 1), (8, 9, 2), (8, 16, 3), (8, 15, 4),
 (9, 5, 0), (9, 6, 1), (9, 2, 2),
 (10, 6, 0), (10, 5, 1), (10, 8, 2),
 (11, 4, 0), (11, 12, 1),
 (12, 4, 0), (12, 11, 1), (12, 2, 2),
 (13, 2, 0), (13, 14, 1),
 (14, 13, 0), (14, 2, 1),
 (15, 16, 0), (15, 8, 1), (15, 5, 2),
 (16, 15, 0), (16, 8, 1);
