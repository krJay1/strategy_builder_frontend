# Options Strategy Builder UI (React + Tailwind + TypeScript)

A trading dashboard for options strategy analysis, live payoff charting, portfolio Greeks, margin calculations, and real-time tick streaming via Symphony & Redis WebSockets.

---

## Features

- **Dynamic Legs Builder**: Add, edit, or remove multiple Call/Put legs with customizable Side (BUY/SELL), Segments, Lots, and Entry Prices.
- **Interactive Payoff Chart**:
  - Expiry PnL curve with profit/loss gradients.
  - Target Date ($T+N$) PnL curve.
  - Dynamic Spot Price marker and Break-even points.
  - Real-time crosshair tooltip with PnL projections.
- **Risk & Summary Analytics**:
  - Max Profit, Max Loss, Risk : Reward ratio.
  - Probability of Profit (POP %).
  - Net Premium (Debit / Credit) breakdown.
- **Portfolio Greeks**: Strategy-wide Delta, Gamma, Theta (daily decay), Vega (volatility sensitivity), Rho, and Implied Volatility (IV).
- **Margin Engine**: Realtime margin calculation (Total Margin, Span Margin, Exposure Margin, and Hedge Benefit).
- **Realtime WebSocket Feed**: Connects to the backend `/ws/strategy` stream for instant tick and snapshot updates.

---

## How to Run Locally

### 1. Navigate to the frontend directory
```bash
cd internal/version_2/strategy/frontend
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Start the Development Server
```bash
npm run dev
```

The application will be accessible at **`http://localhost:3000`**.

---

## Connecting with the Backend

1. **Start the Go Strategy Builder Server:**
   ```bash
   go run ./cmd/strategy-builder/main.go
   ```
   *(Running on port `8091`)*

2. **Open `http://localhost:3000` in your browser.**
3. **Click "Set Token / Credentials"** in the top-right header and enter:
   - **Symphony Session Token:** Your active Symphony session token.
   - **User ID & Client ID:** Your client trading account IDs.
4. **Click "Analyze & Subscribe"** to calculate Greeks, Payoff, and initiate the live Symphony & Redis WebSocket feed.
