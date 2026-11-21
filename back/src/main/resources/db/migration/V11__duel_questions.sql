-- F8 duel mode: 75 investor-education questions (15 per category: 5 EASY, 5 MEDIUM, 5 HARD).
-- Placeholder note: prompt_pl, options_pl and explanation_pl currently hold the same English text
-- as *_en until Polish translations are added in a later migration.
-- Educational content only (MiFID II): concepts and consequences, never product advice.

INSERT INTO duel_question (
    id,
    category_id,
    difficulty,
    prompt_en,
    prompt_pl,
    options_en,
    options_pl,
    correct_index,
    explanation_en,
    explanation_pl
)
SELECT
    id,
    category_id,
    difficulty,
    prompt,
    prompt,
    options,
    options,
    correct_index,
    explanation,
    explanation
FROM (VALUES
    -- =========================================================================
    -- Category 1: instruments (Stocks, bonds, ETFs, funds, how an exchange works)
    -- =========================================================================
    (1, 1, 'EASY',
        'What do you own when you buy a share of a public company?',
        ARRAY[
            'A small piece of ownership in the company',
            'A fixed loan the company must repay on a set date',
            'A government guarantee against losing money',
            'A bank deposit insured by the state'
        ],
        0,
        'A share represents a fraction of ownership (equity) in the business, so your value rises or falls with the company. Unlike a loan or deposit, shares carry no promise of fixed repayment.'),

    (2, 1, 'EASY',
        'How does a bond work for the person who buys it?',
        ARRAY[
            'You buy a permanent voting stake in a company',
            'You lend money to an issuer in return for interest and repayment later',
            'You insure your savings against stock market drops',
            'You hold foreign currency inside a brokerage account'
        ],
        1,
        'A bond is a debt contract where a government or company borrows your money and pays periodic interest until maturity. At maturity, the issuer returns the bond''s face value unless it defaults.'),

    (3, 1, 'EASY',
        'What is a dividend?',
        ARRAY[
            'A fee a broker charges to execute a trade',
            'The difference between a share''s buying and selling price',
            'A share of a company''s profits paid out to shareholders',
            'The tax owed when you close an investment account'
        ],
        2,
        'Companies that generate steady profits sometimes distribute part of those earnings to shareholders as cash or extra shares. Dividends are optional and can be cut or stopped if profits fall.'),

    (4, 1, 'EASY',
        'What is an ETF (exchange-traded fund)?',
        ARRAY[
            'A savings account that pays a guaranteed interest rate',
            'A single company share traded only after hours',
            'A government bond issued directly by a central bank',
            'A basket of assets that trades on an exchange like a single share'
        ],
        3,
        'An ETF pools many securities—such as shares or bonds—into one fund whose units can be bought and sold throughout the trading day. That lets an investor spread exposure across many holdings in a single trade.'),

    (5, 1, 'EASY',
        'What is the main role of a stock exchange?',
        ARRAY[
            'To match buyers and sellers of securities transparently under clear rules',
            'To set fixed prices for shares so they cannot drop',
            'To lend money to investors who want to buy shares',
            'To guarantee that every listed company stays profitable'
        ],
        0,
        'An exchange provides an organised, regulated marketplace where orders meet and prices are discovered through supply and demand. It does not control company performance or protect investors from losses.'),

    (6, 1, 'MEDIUM',
        'What is the key difference between an index fund and an actively managed fund?',
        ARRAY[
            'An index fund holds only government bonds',
            'An index fund tracks a market index, while an active fund tries to beat it by picking securities',
            'An active fund can only be bought by institutional banks',
            'An index fund guarantees positive returns every year'
        ],
        1,
        'Index funds follow a preset rule to mirror a benchmark like a broad stock index, which keeps research and trading costs low. Active managers select specific holdings to try to outperform the market, usually for a higher fee.'),

    (7, 1, 'MEDIUM',
        'When market interest rates rise sharply, what typically happens to the price of existing fixed-rate bonds?',
        ARRAY[
            'Their price rises because all bonds become more valuable',
            'Their price stays fixed at face value at all times',
            'Their price falls because new bonds offer higher interest payments',
            'They automatically convert into company shares'
        ],
        2,
        'Newly issued bonds pay the higher market rate, making older bonds with lower fixed coupons less attractive. Sellers must lower the price of existing bonds so their yield matches new ones.'),

    (8, 1, 'MEDIUM',
        'What is the difference between a market order and a limit order?',
        ARRAY[
            'A market order can only be placed when the exchange is closed',
            'A limit order is always executed faster than a market order',
            'A market order is free while a limit order always costs extra',
            'A market order executes immediately at the best available price, while a limit order sets your maximum buy or minimum sell price'
        ],
        3,
        'A market order prioritises speed of execution, even if the price shifts slightly before it fills. A limit order protects your price, though it may stay unfilled if the market never reaches it.'),

    (9, 1, 'MEDIUM',
        'How does an accumulating ETF differ from a distributing ETF?',
        ARRAY[
            'An accumulating ETF automatically reinvests dividends or interest inside the fund instead of paying them out as cash',
            'A distributing ETF can only invest in bonds',
            'An accumulating ETF never changes its share price',
            'A distributing ETF always has higher total returns'
        ],
        0,
        'Accumulating funds keep income inside the fund to buy more underlying assets, compounding automatically. Distributing funds transfer that income to your cash account at regular intervals.'),

    (10, 1, 'MEDIUM',
        'What does a company''s market capitalisation (market cap) measure?',
        ARRAY[
            'The cash sitting in the company''s bank accounts',
            'The total market value of all its outstanding shares',
            'The company''s annual profit before tax',
            'The total debt the company owes to bondholders'
        ],
        1,
        'Market cap equals the current share price multiplied by the number of shares in issue. It reflects how the market values the whole company, not just whether one share looks cheap or expensive.'),

    (11, 1, 'HARD',
        'Why does a long-term fixed-rate bond usually lose more value than a short-term bond when interest rates rise?',
        ARRAY[
            'Long-term bonds are always issued by weaker borrowers',
            'Short-term bonds never trade on secondary markets',
            'Its lower fixed coupon is locked in for many more years, increasing its duration',
            'Short-term bonds pay dividends instead of interest'
        ],
        2,
        'Duration measures how sensitive a bond''s price is to rate changes, and longer maturities mean more future cash flows are discounted at the higher rate. Investors therefore demand a steeper price discount to hold an older long-term bond.'),

    (12, 1, 'HARD',
        'What does "tracking difference" tell you about an index ETF?',
        ARRAY[
            'How many times a day the ETF''s price updates',
            'The delay between placing an order and settlement',
            'The number of countries included in the index',
            'How closely the ETF''s actual return matched its benchmark index over a period'
        ],
        3,
        'Tracking difference is the gap between the fund''s real return and the index''s return, reflecting fees, trading costs, and dividend taxation. A small tracking difference shows the ETF replicates its index efficiently.'),

    (13, 1, 'HARD',
        'If a company goes bankrupt and its assets are sold, who is paid first between bondholders and common shareholders?',
        ARRAY[
            'Bondholders are paid before common shareholders',
            'Common shareholders are paid before bondholders',
            'Both groups split every remaining euro equally',
            'Whichever group bought their securities most recently'
        ],
        0,
        'Bondholders are creditors with a legal claim on assets ahead of equity owners. Common shareholders are last in line and may lose their entire stake if assets do not cover debts.'),

    (14, 1, 'HARD',
        'How does a physically replicated ETF differ from a synthetically replicated ETF?',
        ARRAY[
            'Physical ETFs can only be bought in paper form at a bank branch',
            'A physical ETF holds the underlying securities, while a synthetic ETF uses swap contracts with a counterparty to deliver the index return',
            'Synthetic ETFs cannot track stock indices',
            'Physical ETFs carry zero market risk'
        ],
        1,
        'Physical replication buys the actual shares or bonds in the index or a representative sample. Synthetic replication relies on a derivative swap with a financial institution, adding counterparty risk that collateral is used to limit.'),

    (15, 1, 'HARD',
        'What is liquidity risk when trading a thinly traded stock or ETF?',
        ARRAY[
            'The risk that the company runs out of raw materials',
            'The risk that your broker deletes your account during market hours',
            'The risk that you cannot buy or sell quickly without moving the price against yourself',
            'The risk that inflation exceeds the central bank''s target'
        ],
        2,
        'When few buyers and sellers are active, the gap between bid and ask prices widens and larger orders push the price further. That makes entering or exiting a position more costly, especially during market stress.'),

    -- =========================================================================
    -- Category 2: risk (Volatility, correlation, time horizon, rebalancing)
    -- =========================================================================
    (16, 2, 'EASY',
        'What is the main purpose of diversification in a portfolio?',
        ARRAY[
            'To guarantee you never experience a negative month',
            'To double your expected return without adding risk',
            'To avoid paying any brokerage fees or taxes',
            'To reduce the impact of any single investment performing poorly'
        ],
        3,
        'Spreading money across different assets, sectors, and regions means one failing company or sector cannot wipe out your whole portfolio. Diversification lowers specific risk, though it cannot remove market-wide downturns.'),

    (17, 2, 'EASY',
        'In investing, what does "volatility" measure?',
        ARRAY[
            'How widely an asset''s price swings up and down over time',
            'The total fee charged by a fund each year',
            'The chance that a bank branch closes permanently',
            'The number of dividends paid in a calendar year'
        ],
        0,
        'High volatility means larger and faster price movements in both directions, while low volatility means steadier prices. Volatility describes price bumps along the road, not necessarily permanent loss.'),

    (18, 2, 'EASY',
        'Why does a longer time horizon generally make stock market ups and downs easier to handle?',
        ARRAY[
            'Because stocks are legally prohibited from falling over ten years',
            'Because you have more time to wait out downturns without being forced to sell at a low price',
            'Because brokers refund losses on accounts older than five years',
            'Because fees drop to zero after the first year'
        ],
        1,
        'Short-term market drops can be steep, and needing cash immediately forces you to lock in those losses. A longer horizon gives investments time to recover and benefit from long-term growth.'),

    (19, 2, 'EASY',
        'You need a sum of money for a house deposit in six months. What is the main danger of putting it all into volatile shares?',
        ARRAY[
            'Your shares cannot be sold for at least five years',
            'Dividends are taxed at 100% in the first year',
            'A short-term market drop could leave you short of cash right when you need it',
            'Stock exchanges do not allow withdrawals under one year'
        ],
        2,
        'Equities can fall sharply over a few months with no time to recover before your deadline. Money needed in the near future carries high timing risk when placed in volatile assets.'),

    (20, 2, 'EASY',
        'Why is owning shares in five different banks less diversified than owning five companies across different industries?',
        ARRAY[
            'Banks never pay dividends to small investors',
            'You cannot hold more than three stocks from the same industry',
            'Bank shares have higher brokerage commissions',
            'Companies in the same industry often react to the same economic shocks together'
        ],
        3,
        'If interest rates, regulation, or a credit downturn hits banking, all five stocks can drop at the same time. Spreading holdings across unrelated industries reduces exposure to a single sector shock.'),

    (21, 2, 'MEDIUM',
        'What does "rebalancing" a portfolio mean?',
        ARRAY[
            'Adjusting holdings back to your target mix after market moves shift the weights',
            'Selling everything whenever the market falls by 5%',
            'Moving all money into whichever asset performed best last year',
            'Checking your account balance at the same time every day'
        ],
        0,
        'When one asset class grows faster than others, it takes up a larger share of your portfolio and changes your risk level. Rebalancing trims what grew overweight or adds to underweight assets to restore your intended risk mix.'),

    (22, 2, 'MEDIUM',
        'What does a low or negative correlation between two assets mean for a portfolio?',
        ARRAY[
            'Both assets are guaranteed to lose money together',
            'When one asset falls, the other tends to move independently or even rise, smoothing total swings',
            'Neither asset can be traded on a public exchange',
            'Both assets pay the exact same annual return'
        ],
        1,
        'Correlation measures how closely two assets move together, from +1 (in lockstep) to -1 (opposite directions). Combining assets with low correlation can reduce overall portfolio volatility without sacrificing as much return.'),

    (23, 2, 'MEDIUM',
        'What is "drawdown" in investing?',
        ARRAY[
            'The yearly fee deducted from a fund''s assets',
            'The interest earned on cash waiting to be invested',
            'The percentage drop from a portfolio''s peak value to a subsequent low before it recovers',
            'The amount of money you deposit each month'
        ],
        2,
        'Maximum drawdown shows the worst peak-to-trough fall an investment experienced over a period. Looking at drawdowns helps investors judge whether they could stomach the rough patches without panicking.'),

    (24, 2, 'MEDIUM',
        'Why does a 50% drop in an investment require a 100% gain just to get back to even?',
        ARRAY[
            'Because exchanges charge a 50% recovery fee',
            'Because inflation automatically doubles during downturns',
            'Because losses are taxed twice as heavily as gains',
            'Because the recovery percentage is calculated on the smaller remaining amount'
        ],
        3,
        'If €1,000 drops by 50%, you are left with €500, and €500 must double (+100%) to reach €1,000 again. This asymmetry is why avoiding extreme, unrecoverable losses matters so much.'),

    (25, 2, 'MEDIUM',
        'What is "unsystematic" (company-specific) risk?',
        ARRAY[
            'Risk tied to a single business or sector, which can be largely reduced through diversification',
            'Risk that affects the entire global economy at once',
            'Risk caused solely by currency exchange fees',
            'Risk that only exists in government bonds'
        ],
        0,
        'Product recalls, poor management, or a lawsuit can hurt one company even when the wider market is fine. Holding many unrelated companies spreads out this specific risk, leaving mainly broader market risk.'),

    (26, 2, 'HARD',
        'What is "sequence-of-returns risk", especially important near retirement?',
        ARRAY[
            'The risk that your broker processes buy orders in alphabetical order',
            'The risk that sharp market losses early while you are withdrawing money permanently deplete your portfolio faster',
            'The risk that dividends arrive a week later than expected',
            'The risk that stock indices change their component companies each quarter'
        ],
        1,
        'Selling shares to fund living expenses during an early downturn leaves far fewer units to participate when markets rebound. Two portfolios with the same average return can end up very differently depending on when losses occur.'),

    (27, 2, 'HARD',
        'What does "currency risk" mean when you hold foreign-currency assets?',
        ARRAY[
            'The risk that banknotes tear or wear out in storage',
            'The risk that foreign companies cannot list on exchanges',
            'The risk that exchange-rate moves change the value of your investment in your home currency',
            'The risk that a country stops using electronic payments'
        ],
        2,
        'Even if a foreign stock rises 10% in its local currency, a 10% drop in that currency against yours can wipe out the gain at home. Currency shifts can either boost or reduce your unhedged returns.'),

    (28, 2, 'HARD',
        'What is "concentration risk" inside a broad market-cap-weighted index?',
        ARRAY[
            'The risk that an index holds too many small companies to track',
            'The risk that all companies in the index have identical share prices',
            'The risk that the index stops trading during holidays',
            'The risk that a handful of giant companies make up a very large share of the index''s value'
        ],
        3,
        'Market-cap weighting assigns larger weights to the biggest firms, so a few dominant companies or one booming sector can drive most of the index''s swings. Even an index with hundreds of names can behave less broadly than its headline count suggests.'),

    (29, 2, 'HARD',
        'Why can correlations between risky assets rise sharply during a severe financial crisis?',
        ARRAY[
            'Because stressed investors often sell many different assets at once to raise cash',
            'Because central banks legally lock all stock prices together',
            'Because exchange computers stop updating individual prices',
            'Because diversification is banned during market crashes'
        ],
        0,
        'In a panic, funds and investors liquidate whatever they can to meet cash needs, pulling normally separate risky markets down together. That is why truly defensive assets and cash buffers are considered alongside equities.'),

    (30, 2, 'HARD',
        'What does the Sharpe ratio help an investor compare across two portfolios?',
        ARRAY[
            'Which portfolio paid the lowest brokerage commission',
            'How much excess return above a risk-free rate each portfolio earned per unit of volatility',
            'How many companies each portfolio contains',
            'How quickly each portfolio can be converted into cash'
        ],
        1,
        'A higher return achieved with wild price swings is not automatically better than a steadier return. The Sharpe ratio puts return and volatility side by side to measure risk-adjusted performance.'),

    -- =========================================================================
    -- Category 3: costs (Fees, TER, spread, generic tax on gains)
    -- =========================================================================
    (31, 3, 'EASY',
        'What is a fund''s TER (Total Expense Ratio)?',
        ARRAY[
            'The guaranteed yearly return the fund promises to pay',
            'The tax rate applied when you sell the fund',
            'The annual percentage of a fund''s assets taken to cover its ongoing operating costs',
            'The minimum deposit needed to open a brokerage account'
        ],
        2,
        'TER summarises the yearly management and administrative costs deducted directly from the fund''s value every day. Even though you never receive a separate bill, a higher TER lowers your net return every year.'),

    (32, 3, 'EASY',
        'What is the "bid-ask spread" when you buy or sell a security?',
        ARRAY[
            'The profit a company keeps after paying dividends',
            'The annual fee charged by a fund manager',
            'The time delay between clicking buy and seeing the shares',
            'The gap between the highest price buyers will pay and the lowest price sellers will accept'
        ],
        3,
        'You typically buy at the slightly higher ask price and sell at the slightly lower bid price, making the spread an immediate hidden trading cost. Narrower spreads mean cheaper execution, especially if you trade frequently.'),

    (33, 3, 'EASY',
        'Why do small annual percentage fees matter so much over 20 or 30 years?',
        ARRAY[
            'Because fees compound every year, reducing both your balance and the future returns that money would have earned',
            'Because fees double automatically every five years by law',
            'Because brokers charge fees only when you make a loss',
            'Because high-fee funds are taxed at a higher rate'
        ],
        0,
        'Every euro taken out in fees is a euro that can no longer grow for you in all the years that follow. Over decades, even a 1% annual fee gap can consume a surprisingly large share of your final portfolio.'),

    (34, 3, 'EASY',
        'When is capital gains tax typically triggered on an investment?',
        ARRAY[
            'Every time a share price moves up on your screen',
            'When you sell an investment for more than you paid for it (a realised gain)',
            'Whenever you log into your brokerage app',
            'Only when you invest in government bonds'
        ],
        1,
        'In most tax systems, paper gains while you still hold an asset are unrealised and not taxed yet. Selling at a profit turns it into a realised gain, which generally creates a taxable event.'),

    (35, 3, 'EASY',
        'What is a brokerage commission?',
        ARRAY[
            'A bonus paid by a company to its loyal shareholders',
            'The interest rate earned on uninvested cash',
            'A fee paid to a broker or platform for executing a buy or sell order',
            'The yearly inflation adjustment on a bond'
        ],
        2,
        'Brokers may charge a flat fee per trade, a percentage of the trade size, or earn money through spreads and other services. Knowing the fee per order prevents small, frequent trades from being eaten up by costs.'),

    (36, 3, 'MEDIUM',
        'A "zero-commission" broker charges €0 per trade. How can trading there still cost you money?',
        ARRAY[
            'It cannot—zero commission means the total cost of trading is always zero',
            'Zero-commission brokers are not allowed to execute orders on exchanges',
            'Zero-commission trades are automatically taxed at a higher rate',
            'Through wider bid-ask spreads, currency conversion markups, or product fees'
        ],
        3,
        'Commission is only one part of trading cost; spreads, foreign-exchange markups, and ongoing fund fees still reduce your net result. Comparing total all-in costs gives a clearer picture than looking at headline commissions alone.'),

    (37, 3, 'MEDIUM',
        'Why does investing a very small amount with a fixed €10 order commission hurt your starting return?',
        ARRAY[
            'A €10 fee on a €100 purchase is an immediate 10% cost before the asset even moves',
            'Fixed commissions are deducted every month forever',
            'Exchanges reject orders smaller than €1,000',
            'Small orders cannot earn dividends'
        ],
        0,
        'A flat fee represents a much larger percentage of a tiny order than of a larger one, so your investment must rise significantly just to break even. Batching contributions or checking fee schedules helps keep cost percentages low.'),

    (38, 3, 'MEDIUM',
        'What is a "performance fee" in some actively managed funds?',
        ARRAY[
            'A discount given when the fund beats inflation',
            'An extra charge taken by the manager when the fund''s returns exceed a set benchmark or threshold',
            'A penalty paid by the manager to investors whenever the fund loses money',
            'A government fee paid for listing a fund on an exchange'
        ],
        1,
        'On top of the regular management fee, a performance fee takes a slice of profits above a hurdle rate. Because managers rarely refund fees during bad years, this structure can skew costs against investors if not designed fairly.'),

    (39, 3, 'MEDIUM',
        'What is "dividend withholding tax"?',
        ARRAY[
            'A fee charged by a company when it cancels a dividend',
            'A tax only paid by investors who sell shares within 24 hours',
            'A tax deducted at source before a foreign or domestic dividend reaches your account',
            'A refund paid to shareholders who hold ETFs'
        ],
        2,
        'When a company pays a dividend—especially across borders—the issuer''s country often withholds a percentage as tax before payout. Depending on tax treaties and your account type, part of it may or may not be reclaimable.'),

    (40, 3, 'MEDIUM',
        'How does high portfolio turnover (buying and selling very often) affect net returns?',
        ARRAY[
            'It eliminates all market volatility',
            'It lowers your taxes because gains are reset daily',
            'It forces fund managers to waive the TER',
            'It increases cumulative trading costs, spreads, and potentially earlier tax bills'
        ],
        3,
        'Every trade incurs spreads, commissions, or market impact, and selling winners early can trigger capital gains tax sooner. Higher activity creates a higher hurdle your decisions must beat just to break even.'),

    (41, 3, 'HARD',
        'What is "tax drag" in a taxable investment account?',
        ARRAY[
            'The reduction in long-term compounding caused by paying taxes on dividends or realised gains along the way',
            'The time it takes a tax office to process a return',
            'A penalty charged for opening more than one savings account',
            'The difference between gross salary and net salary'
        ],
        0,
        'Whenever tax is paid on distributed income or realised gains, that money leaves your portfolio and can no longer compound. Deferring taxes until later—for instance by holding longer or using tax-advantaged wrappers—lets more capital stay invested.'),

    (42, 3, 'HARD',
        'Why can two ETFs with the exact same TER still deliver slightly different returns on the same index?',
        ARRAY[
            'Because one ETF ignores the stock market on Fridays',
            'Because internal trading costs, dividend withholding taxes, and securities lending revenue are not all captured inside the TER',
            'Because TER is only an estimate and never actually charged',
            'Because exchanges assign random bonus returns to larger funds'
        ],
        1,
        'TER covers management and administrative expenses, but omits transaction costs inside the fund, tax treatment of dividends, and potential lending income. Comparing actual tracking difference against the index shows the true total cost.'),

    (43, 3, 'HARD',
        'What is a "front-end load" (entry fee) on a traditional mutual fund?',
        ARRAY[
            'A fee paid only if you hold the fund for more than ten years',
            'The cost of printing the fund''s annual report',
            'An upfront percentage charge deducted from your money at the moment you invest',
            'A tax refund applied to your first deposit'
        ],
        2,
        'If a fund charges a 5% entry fee on €1,000, only €950 is actually invested on day one. Your remaining money must immediately grow by more than 5% just to recover the upfront fee.'),

    (44, 3, 'HARD',
        'How does a "high-water mark" protect investors in a fund that charges a performance fee?',
        ARRAY[
            'It caps the fund''s maximum share price so it never becomes expensive',
            'It guarantees the fund can never lose more than 10% in a year',
            'It forces the fund to hold at least half its money in cash',
            'It ensures the manager cannot charge a performance fee again until previous losses have been recovered'
        ],
        3,
        'Without a high-water mark, a fund could fall 20%, bounce back 20%, and charge a performance fee even though investors are still below their starting value. A high-water mark requires the fund to surpass its previous peak before earning new performance fees.'),

    (45, 3, 'HARD',
        'Why is currency conversion (FX) markup often an overlooked cost for retail investors?',
        ARRAY[
            'Because a hidden percentage markup is often built into the exchange rate when buying and selling foreign assets',
            'Because currencies can only be converted once a year',
            'Because FX markups are refunded automatically at year-end',
            'Because FX costs only apply to physical banknotes, never online trades'
        ],
        0,
        'If a platform adds a 0.5% to 1.5% markup to the exchange rate on both the buy and the sell, you lose that round-trip cost even when the trade is advertised as commission-free. Checking the FX fee or holding the settlement currency shows the real cost.'),

    -- =========================================================================
    -- Category 4: money-basics (Real return, interest, compounding, emergency fund)
    -- =========================================================================
    (46, 4, 'EASY',
        'What does inflation do to cash sitting in a 0% current account over several years?',
        ARRAY[
            'It increases the number of euros in the account',
            'It steadily reduces what that cash can buy (its purchasing power)',
            'It has no effect as long as you do not withdraw the money',
            'It turns the cash into compound interest automatically'
        ],
        1,
        'Inflation means the general level of prices rises over time, so the same amount of money buys fewer goods and services. Even though the number on your statement stays unchanged, its real value shrinks.'),

    (47, 4, 'EASY',
        'What is compound interest?',
        ARRAY[
            'Interest paid only on the very last day of a 10-year loan',
            'A special bank penalty for withdrawing money early',
            'Earning returns not only on your original money, but also on the returns you already earned',
            'An interest rate that drops every year you stay invested'
        ],
        2,
        'When gains stay invested, they generate their own gains in future periods, creating a snowball effect. Over long horizons, reinvested returns often grow larger than the original contributions.'),

    (48, 4, 'EASY',
        'Why do financial educators suggest building an emergency fund before taking investment risk?',
        ARRAY[
            'Because brokers legally refuse accounts without a separate savings buffer',
            'Because emergency funds always earn higher returns than stocks',
            'Because an emergency fund exempts you from paying inflation',
            'So unexpected costs do not force you to sell investments at a bad time or take on costly debt'
        ],
        3,
        'A sudden car repair or job loss can hit right during a market downturn. Having liquid, safe cash set aside protects your long-term investments from being liquidated at a loss.'),

    (49, 4, 'EASY',
        'Inflation is 4% a year and your savings account pays 2% interest. What happens to your purchasing power?',
        ARRAY[
            'You lose roughly 2% of purchasing power over the year',
            'You gain 6% in purchasing power',
            'You gain 2% in purchasing power',
            'Your purchasing power stays completely unchanged'
        ],
        0,
        'Because prices are rising faster than your savings earn interest, your real return is negative (roughly 2% - 4% = -2%). Your balance grows in nominal terms, yet buys less than a year earlier.'),

    (50, 4, 'EASY',
        'Which qualities matter most for an emergency fund?',
        ARRAY[
            'Maximum long-term growth potential, even with large price swings',
            'Safety of principal and quick, penalty-free access to cash',
            'Being locked away for at least five years so you cannot touch it',
            'Being concentrated in a single fast-growing company'
        ],
        1,
        'An emergency fund is insurance for urgent life events, so you need the full amount available immediately without worrying about market crashes. High return is secondary to stability and liquidity.'),

    (51, 4, 'MEDIUM',
        'What is the "Rule of 72" used for?',
        ARRAY[
            'Calculating the exact tax owed on dividends',
            'Choosing how many stocks belong in an index',
            'Roughly estimating how many years it takes an investment to double at a fixed annual return',
            'Measuring the maximum drawdown of a bond fund'
        ],
        2,
        'Dividing 72 by the annual percentage return gives a quick estimate of doubling time—for example, about 12 years at 6%. It also works in reverse to show how quickly inflation halves purchasing power.'),

    (52, 4, 'MEDIUM',
        'What is the difference between nominal return and real return?',
        ARRAY[
            'Nominal return is before fees; real return is before taxes',
            'Real return only counts dividends, while nominal return only counts price changes',
            'Nominal return is paid in foreign currency, while real return is paid in local currency',
            'Nominal return is the headline percentage gain, while real return adjusts it for inflation'
        ],
        3,
        'Nominal return tells you how much more money you have in currency units, while real return tells you how much more you can actually buy. Focusing on real return keeps long-term goals anchored to true living costs.'),

    (53, 4, 'MEDIUM',
        'Why does starting to invest ten years earlier often beat investing a larger monthly amount later?',
        ARRAY[
            'Extra years give compounding far more cycles to multiply earlier contributions',
            'Stock markets always grow faster for younger investors',
            'Older investors pay higher fund expense ratios',
            'Compounding stops working after age 40'
        ],
        0,
        'Compound growth accelerates over time because each year''s gain builds on an ever-larger base. Giving money an extra decade to compound does heavy lifting that is hard to match purely by saving more later.'),

    (54, 4, 'MEDIUM',
        'What is the difference between simple interest and compound interest over multiple years?',
        ARRAY[
            'Simple interest is always paid monthly, while compound interest is paid once a decade',
            'Simple interest is calculated only on the original principal, whereas compound interest is also calculated on accumulated interest',
            'Simple interest always yields more money than compound interest',
            'Compound interest applies only to mortgages, never to savings or investments'
        ],
        1,
        'With simple interest, your balance grows by the same fixed euro amount each period. With compound interest, each period''s interest adds to the base, causing growth to curve upward over time.'),

    (55, 4, 'MEDIUM',
        'How does regular monthly investing (cost averaging) work when prices move up and down?',
        ARRAY[
            'It guarantees a profit even if an asset permanently loses value',
            'It buys the exact same number of shares every month regardless of price',
            'Investing a fixed amount buys more units when prices are low and fewer when prices are high',
            'It pauses your contributions automatically whenever markets drop'
        ],
        2,
        'Contributing a steady sum on a schedule lowers the average purchase price per unit during dips without needing to predict market bottoms. It reduces timing stress, though it does not eliminate the risk of a long-term decline.'),

    (56, 4, 'HARD',
        'An investment returns +50% in year 1 and -50% in year 2. What is your two-year result?',
        ARRAY[
            '0% — you are back to your exact starting amount',
            '+25% — because gains compound faster than losses',
            '-10% — due to annual inflation',
            '-25% — because the 50% drop applies to the larger year-1 balance'
        ],
        3,
        'Starting with €100, a +50% gain takes you to €150, and a -50% drop cuts €150 in half to €75—a 25% loss overall. Arithmetic averages can mislead because actual wealth grows multiplicatively (geometrically).'),

    (57, 4, 'HARD',
        'Using the exact Fisher equation, if a nominal return is 10% and inflation is 5%, what is the real return?',
        ARRAY[
            'About 4.76% — slightly less than 10% - 5%',
            'Exactly 5.00% in every case',
            'About 5.25% — slightly more than 10% - 5%',
            'About 15.00% — because inflation adds to returns'
        ],
        0,
        'Exact real return is (1 + 0.10) / (1 + 0.05) - 1 ≈ 4.76%, because inflation also erodes the value of the return itself, not just your original principal. Subtracting inflation is a handy shortcut when rates are low, but overstates real return slightly.'),

    (58, 4, 'HARD',
        'Why is the geometric (compound) average return always less than or equal to the arithmetic average return?',
        ARRAY[
            'Because geometric averages exclude dividends',
            'Because volatility creates a drag: losses shrink the base that future gains multiply from',
            'Because arithmetic averages ignore negative years',
            'Because geometric averages are calculated only on bonds'
        ],
        1,
        'Two identical years produce the same arithmetic and geometric average, but any ups and downs widen the gap between them. The wider the swings, the lower the actual compound return compared with the simple average.'),

    (59, 4, 'HARD',
        'If you pay off a high-interest credit card charging 18% a year instead of investing that cash, what is the financial equivalent?',
        ARRAY[
            'Earning 0% because paying debt creates no asset',
            'Taking on 18% stock market volatility',
            'Earning a guaranteed, risk-free 18% after-tax return on the money used to repay it',
            'Losing 18% in immediate purchasing power'
        ],
        2,
        'Every euro of 18% debt you eliminate saves 18 cents of interest every year with zero market risk. Very few investments can reliably beat high-interest consumer debt after taxes and risk.'),

    (60, 4, 'HARD',
        'How does compounding frequency affect the effective annual rate (EAR) for the same nominal interest rate?',
        ARRAY[
            'Compounding more often lowers the effective annual rate',
            'Compounding frequency has no mathematical effect at all',
            'Compounding monthly doubles the effective annual rate compared with yearly',
            'More frequent compounding produces a slightly higher effective annual rate because interest starts earning interest sooner'
        ],
        3,
        'For example, 6% compounded monthly yields an effective rate of about 6.17% rather than 6.00% compounded annually. Comparing effective annual rates puts accounts or loans with different compounding schedules on an equal footing.'),

    -- =========================================================================
    -- Category 5: psychology (FOMO, loss aversion, herd behaviour, overconfidence)
    -- =========================================================================
    (61, 5, 'EASY',
        'Markets drop 15% in a week and you want to sell everything. Which bias is this?',
        ARRAY[
            'Overconfidence',
            'Loss aversion',
            'Anchoring',
            'Home bias'
        ],
        1,
        'Losses feel about twice as painful as equal gains feel good, so we rush to stop the pain. Panic-selling locks in losses that time often recovers.'),

    (62, 5, 'EASY',
        'You keep buying the stock everyone at work talks about. Which bias is this?',
        ARRAY[
            'Overconfidence',
            'Sunk cost fallacy',
            'Herd behaviour',
            'Confirmation bias'
        ],
        2,
        'Following the crowd feels safe because others seem to know more. Prices driven by hype can fall just as fast when the crowd moves on.'),

    (63, 5, 'EASY',
        'What is FOMO (Fear of Missing Out) in investing?',
        ARRAY[
            'Keeping an emergency fund in a bank account',
            'Checking a fund''s fees before investing',
            'Waiting patiently for your regular monthly contribution date',
            'Rushing into a fast-rising asset because you worry others are getting rich without you'
        ],
        3,
        'FOMO pushes people to buy after a sharp rally, when expectations and prices are already stretched. Acting on urgency rather than a plan often leads to buying high and regretting it when the hype cools.'),

    (64, 5, 'EASY',
        'After two lucky trades, an investor believes they can reliably beat the market and stops diversifying. Which bias is this?',
        ARRAY[
            'Overconfidence',
            'Loss aversion',
            'Home bias',
            'Status quo bias'
        ],
        0,
        'Overconfidence leads people to mistake short-term luck for lasting skill and underestimate risk. Research shows overconfident investors tend to trade too much and earn lower net returns.'),

    (65, 5, 'EASY',
        'You refuse to sell a stock until it gets back to the exact price you originally paid, ignoring its current outlook. Which bias is this?',
        ARRAY[
            'Herd behaviour',
            'Anchoring',
            'Recency bias',
            'Survivorship bias'
        ],
        1,
        'Anchoring makes your mind fixate on an arbitrary past number—like your purchase price—even though the market does not know or care what you paid. Decisions work better when based on future prospects rather than past prices.'),

    (66, 5, 'MEDIUM',
        'You already own a stock and only read articles that praise it, dismissing warning signs as "noise". Which bias is this?',
        ARRAY[
            'Mental accounting',
            'Home bias',
            'Confirmation bias',
            'Loss aversion'
        ],
        2,
        'Confirmation bias makes us seek information that backs up what we already believe and ignore conflicting evidence. Actively looking for the strongest counter-argument helps keep your judgment balanced.'),

    (67, 5, 'MEDIUM',
        'Why is "recency bias" dangerous after several strong years in the stock market?',
        ARRAY[
            'It makes investors forget their brokerage password',
            'It forces investors to hold 100% cash forever',
            'It reduces the fees charged by active funds',
            'It tricks people into assuming recent booming returns will continue smoothly without downturns'
        ],
        3,
        'Our brains give extra weight to the most recent experiences, making yesterday''s trend feel permanent. Extrapolating a hot streak can lead investors to take far more risk right before a pullback.'),

    (68, 5, 'MEDIUM',
        'What is "home bias" in a retail investor''s portfolio?',
        ARRAY[
            'Putting far too much money into domestic companies simply because they feel familiar',
            'Investing only from a home computer instead of a phone',
            'Refusing to invest in real estate companies',
            'Keeping all savings in a single emergency account'
        ],
        0,
        'Familiar household names feel safer than foreign businesses, even when your home country is a small slice of the global economy. Concentrating at home ties both your job and your investments to the same local economy.'),

    (69, 5, 'MEDIUM',
        'What is the "sunk cost fallacy" when managing an investment you no longer believe in?',
        ARRAY[
            'Comparing brokerage fees before placing an order',
            'Holding onto a failing position simply because you already poured money or time into it',
            'Setting aside money each month automatically',
            'Calculating your real return after inflation'
        ],
        1,
        'Money already lost is gone whether you hold or sell, so past cost should not dictate your next move. A helpful test is asking whether you would still choose this investment today if you held cash instead.'),

    (70, 5, 'MEDIUM',
        'Why can checking your portfolio balance ten times a day actually hurt your long-term results?',
        ARRAY[
            'Brokers charge a viewing fee after five logins a day',
            'Checking prices changes the underlying value of companies',
            'Seeing constant short-term red numbers triggers emotional stress and impulsive trading',
            'Frequent logins automatically reset your compounding period'
        ],
        2,
        'Daily market prices are mostly random noise, and seeing frequent drops activates loss aversion even in a healthy long-term trend. Checking less often makes it easier to stick with a calm, planned strategy.'),

    (71, 5, 'HARD',
        'What is the "disposition effect" observed in retail investors?',
        ARRAY[
            'Rebalancing a portfolio once a year on a fixed date',
            'Buying index funds only during market downturns',
            'Holding bonds until they reach maturity',
            'Selling winning investments too early to lock in a good feeling while clinging to losers to avoid admitting a loss'
        ],
        3,
        'Driven by loss aversion and regret avoidance, investors often cash out winners prematurely while hoping losers rebound. This habit can cut short long-term compounding and leave a portfolio full of weak holdings.'),

    (72, 5, 'HARD',
        'What is "mental accounting" in personal finance?',
        ARRAY[
            'Treating euros differently depending on their label—such as taking reckless risks with a bonus while guarding salary carefully',
            'Using a spreadsheet to track monthly household expenses',
            'Calculating capital gains tax accurately before filing',
            'Comparing two funds by their expense ratios'
        ],
        0,
        'Every euro has the same purchasing power regardless of where it came from, yet people place money into separate mental buckets. Treating windfall gains as play money can lead to risks you would never take with regular savings.'),

    (73, 5, 'HARD',
        'Why does "survivorship bias" make historical fund rankings look more impressive than reality?',
        ARRAY[
            'Because older investors live longer than younger investors',
            'Because poorly performing funds are shut down or merged and vanish from the database, leaving mainly winners visible',
            'Because exchanges delete data from profitable years',
            'Because only bonds are included in fund rankings'
        ],
        1,
        'When you only inspect funds that survived ten years, you miss all the weak ones that closed along the way. That makes past active-fund averages look stronger than what investors actually experienced.'),

    (74, 5, 'HARD',
        'What is "hindsight bias" after a big market crash or boom?',
        ARRAY[
            'Reviewing your past mistakes to improve your checklist',
            'Looking at long-term historical inflation before retiring',
            'Convincing yourself afterward that the move was obvious all along, which feeds future overconfidence',
            'Comparing a fund''s performance against its benchmark index'
        ],
        2,
        'Once an outcome is known, our brains rewrite the story so it seems predictable, forgetting how uncertain the moment truly felt. Believing the past was easy to foresee tricks investors into thinking they can time the next turn.'),

    (75, 5, 'HARD',
        'Why do written investment rules (like an investment policy or scheduled contributions) help counter behavioural biases?',
        ARRAY[
            'Because written plans legally prevent markets from falling',
            'Because brokers pay higher interest to clients who upload a plan',
            'Because rules eliminate the need to understand risk or fees',
            'Because deciding how to act while calm reduces the chance of emotional choices during panic or euphoria'
        ],
        3,
        'Stress and excitement narrow our thinking right when the stakes feel highest. Pre-committing to clear rules—such as how you rebalance or when you contribute—acts as a seatbelt against heat-of-the-moment impulses.')
) AS q(id, category_id, difficulty, prompt, options, correct_index, explanation);

SELECT setval('duel_question_id_seq', 75);
