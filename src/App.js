import React, { useEffect, useState } from "react";

export default function App() {
  const ALPHA_VANTAGE_KEY = "X0GQPIMRCCZSKU8H";

  const [prices, setPrices] = useState({});
  const [prevCryptoPrices, setPrevCryptoPrices] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  const assets = [
    { name: "Tesla", ticker: "TSLA", type: "stock" },
    { name: "Apple", ticker: "AAPL", type: "stock" },
    { name: "Amazon", ticker: "AMZN", type: "stock" },
    { name: "Bitcoin", id: "bitcoin", type: "crypto" },
    { name: "Ethereum", id: "ethereum", type: "crypto" },
  ];

  const fetchPrices = async () => {
    try {
      const results = await Promise.all(
        assets.map(async (asset) => {
          if (asset.type === "stock") {
            const response = await fetch(
              `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${asset.ticker}&apikey=${ALPHA_VANTAGE_KEY}`
            );
            const data = await response.json();
            const quote = data["Global Quote"];
            return {
              name: asset.name,
              ticker: asset.ticker,
              type: "stock",
              current: quote ? parseFloat(quote["05. price"]) : null,
              open: quote ? parseFloat(quote["02. open"]) : null,
              high: quote ? parseFloat(quote["03. high"]) : null,
              low: quote ? parseFloat(quote["04. low"]) : null,
              previousClose: quote
                ? parseFloat(quote["08. previous close"])
                : null,
            };
          } else if (asset.type === "crypto") {
            const response = await fetch(
              `https://api.coingecko.com/api/v3/simple/price?ids=${asset.id}&vs_currencies=usd`
            );
            const data = await response.json();
            const currentPrice = data[asset.id]?.usd ?? null;
            const previousPrice = prevCryptoPrices[asset.id] ?? currentPrice;
            return {
              name: asset.name,
              id: asset.id,
              type: "crypto",
              current: currentPrice,
              previous: previousPrice,
            };
          }
        })
      );

      // Store stocks by ticker, crypto by id
      const formatted = Object.fromEntries(
        results.map((r) => [r.type === "stock" ? r.ticker : r.id, r])
      );
      setPrices(formatted);

      // Update previous crypto prices for next comparison
      const newCryptoPrices = {};
      results.forEach((r) => {
        if (r.type === "crypto") {
          newCryptoPrices[r.id] = r.current;
        }
      });
      setPrevCryptoPrices(newCryptoPrices);

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 300000); // 5 min
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (value) =>
    typeof value === "number" ? `$${value.toFixed(2)}` : "N/A";

  const formatPercent = (current, previous) => {
    if (
      typeof current !== "number" ||
      typeof previous !== "number" ||
      previous === current
    )
      return "";
    return ` (${(((current - previous) / previous) * 100).toFixed(2)}%)`;
  };

  const getArrow = (current, previous) => {
    if (typeof current !== "number" || typeof previous !== "number") return "";
    if (previous === current) return "";
    return current > previous ? " ▲" : " ▼";
  };

  const getColor = (current, previous) => {
    if (typeof current !== "number" || typeof previous !== "number")
      return "gray";
    if (current > previous) return "green";
    if (current < previous) return "red";
    return "gray";
  };

  const formatTimestamp = (date) => {
    if (!date) return "";
    return date.toLocaleString();
  };

  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "40px auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ textAlign: "center" }}>📊 Live Market Dashboard</h1>
      <p style={{ textAlign: "center", fontSize: "12px", color: "gray" }}>
        Last updated: {formatTimestamp(lastUpdated)}
      </p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {assets.map((asset) => {
          const key = asset.type === "stock" ? asset.ticker : asset.id;
          const data = prices[key];
          if (!data)
            return (
              <li key={asset.name} style={{ padding: "10px" }}>
                Loading...
              </li>
            );

          const previous =
            asset.type === "stock"
              ? data.previousClose
              : data.previous ?? data.current;

          return (
            <li
              key={asset.name}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "10px 16px",
                marginBottom: "10px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h3 style={{ marginBottom: "6px" }}>{asset.name}</h3>
              <div style={{ fontSize: "14px", lineHeight: "1.5em" }}>
                <div>
                  <strong>Current:</strong>{" "}
                  <span style={{ color: getColor(data.current, previous) }}>
                    {formatPrice(data.current)}
                    {getArrow(data.current, previous)}
                    {formatPercent(data.current, previous)}
                  </span>
                </div>
                {asset.type === "stock" && (
                  <>
                    <div>
                      <strong>Open:</strong> {formatPrice(data.open)}
                    </div>
                    <div>
                      <strong>High:</strong> {formatPrice(data.high)}
                    </div>
                    <div>
                      <strong>Low:</strong> {formatPrice(data.low)}
                    </div>
                    <div>
                      <strong>Prev Close:</strong>{" "}
                      {formatPrice(data.previousClose)}
                    </div>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p style={{ textAlign: "center", fontSize: "12px", color: "gray" }}>
        Auto-refreshes every 5 minutes
      </p>
    </div>
  );
}
