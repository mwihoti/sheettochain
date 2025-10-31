# Hedera Analytics Dashboard

**DLT-Enhanced Transaction Analytics & CSV Tokenization Platform**

A comprehensive platform for analyzing Hedera transactions and tokenizing CSV datasets using Hedera Token Service (HTS) and Hedera Consensus Service (HCS).

**Status**: ✅ Production-Ready | **Phases**: 3/3 Complete | **Score**: 85-90%

## ✨ Features

### 📊 Transaction Analytics
- **Multi-Network Support**: Mainnet, Testnet, Previewnet
- **Account Search**: Deep dive into any Hedera account
- **Transaction Categorization**: Automated classification engine
- **Beautiful Visualizations**: Charts, graphs, and statistics
- **HBAR Price Integration**: Real-time pricing from CoinGecko
- **CSV Export**: Download transaction data
- **Dark Mode**: Full theme support

### 🪙 CSV Tokenization ✅ COMPLETE
- **Upload CSV Files**: Drag & drop interface (max 10MB)
- **Automatic Validation**: Data quality checks with warnings
- **NFT Minting**: Tokenize datasets on Hedera Token Service
- **HCS Verification**: Immutable hash submission to Consensus Service
- **On-Chain Metadata**: Full dataset info stored with NFT
- **HashScan Integration**: Verify tokens on blockchain explorer
- **Statistical Analysis**: Min/max/avg/median for numeric columns
- **Sample Preview**: View first 10 rows before minting

### 🖼️ Token Gallery ✅ NEW!
- **Beautiful Grid Layout**: Responsive design (1-3 columns)
- **Token Cards**: Gradient designs with metadata
- **HashScan Links**: One-click blockchain verification
- **Refresh**: Reload tokens on demand
- **Empty States**: Friendly onboarding experience

## 🚀 Quick Start

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Hedera Credentials

Create a `.env.local` file:

```bash
cp .env.local.example .env.local
```

Get your testnet credentials from [Hedera Portal](https://portal.hedera.com/) and update:

```bash
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=302e...YOUR_PRIVATE_KEY
HEDERA_NETWORK=testnet

# Optional: HCS Topic for hash verification (create with scripts)
HCS_TOPIC_ID=0.0.YOUR_TOPIC_ID

# Optional: Smart Contract for on-chain registry (deploy with scripts)
SMART_CONTRACT_ID=0.0.YOUR_CONTRACT_ID
```

### 3. Test Connection & Create Topic (Optional)

```bash
# Verify your credentials work
pnpm test:connection

# Create HCS topic for hash verification
pnpm create:topic
# Add the returned topic ID to .env.local

# Deploy smart contract for on-chain registry (requires solc)
pnpm deploy:contract
# Add the returned contract ID to .env.local
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📱 Usage

### Transaction Analytics
1. Navigate to [http://localhost:3000](http://localhost:3000)
2. Enter a Hedera account ID (e.g., `0.0.3229`)
3. View transactions, analytics, and insights

### CSV Tokenization
1. Navigate to [/tokenized-data](http://localhost:3000/tokenized-data)
2. Upload a CSV file (max 10MB, up to 10,000 rows)
3. Review validation results
4. Click "Mint Dataset NFT on Hedera"
5. View your tokenized dataset on HashScan

### Demo & Testing
1. Navigate to [/demo](http://localhost:3000/demo)
2. Click "Run Complete Test"
3. Watch the 6-step workflow validation
4. View minted NFT on HashScan

---

## 🧪 Utility Scripts

### Test Connection
Verify your Hedera credentials:
```bash
pnpm test:connection
```

### Create HCS Topic
Create a topic for CSV hash verification:
```bash
pnpm create:topic
```

See `scripts/README.md` for more details.

---

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 16 + React 19
- **Blockchain**: Hedera SDK (@hashgraph/sdk)
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **CSV Parsing**: PapaParse
- **API**: Hedera Mirror Node REST API

### Hedera Integration
- **Token Service (HTS)**: NFT minting for datasets
- **Consensus Service (HCS)**: Immutable hash verification
- **Mirror Node API**: Transaction data retrieval
- **Networks**: Mainnet, Testnet, Previewnet support

## 📂 Project Structure

```
├── app/
│   ├── page.tsx                 # Main analytics dashboard
│   ├── tokenized-data/          # CSV tokenization page
│   │   └── page.tsx
│   └── api/
│       └── mint-dataset/        # Token minting API
│           └── route.ts
├── components/
│   ├── CSVTokenizer.tsx         # Upload & mint component
│   ├── AccountSearch.tsx        # Search interface
│   └── [other components]
├── lib/
│   ├── services/
│   │   ├── csv-processor.ts     # CSV validation & parsing
│   │   ├── token-minting.ts     # HTS & HCS integration
│   │   ├── categorization.ts    # Transaction classification
│   │   └── hedera-sdk.ts
│   └── api/
│       └── mirror-node.ts       # Mirror Node client
├── public/
│   └── examples/                # Sample CSV files
│       ├── sample-sales.csv
│       └── sample-analytics.csv
└── types/
    └── index.ts                 # TypeScript definitions
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `HEDERA_ACCOUNT_ID` | Your Hedera account (0.0.xxxxx) | Yes |
| `HEDERA_PRIVATE_KEY` | Your private key (302e...) | Yes |
| `HEDERA_NETWORK` | Network (testnet/mainnet/previewnet) | No (default: testnet) |
| `HCS_TOPIC_ID` | HCS topic for hash verification | No (optional) |

### CSV Upload Limits

- Max file size: 10MB
- Max rows: 10,000
- Max columns: 50
- Supported format: CSV with headers

## 📚 Documentation

- [Phase 1 Complete](./PHASE_1_COMPLETE.md) - CSV Processing Service
- [Phase 2 Complete](./PHASE_2_COMPLETE.md) - Token Minting Service
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Full feature roadmap
- [Hackathon Assessment](./HACKATHON_ASSESSMENT.md) - Evaluation criteria

## 🌟 Key Features Explained

### CSV Tokenization Workflow

1. **Upload**: User uploads CSV file
2. **Validate**: System checks data quality, structure, size
3. **Hash**: SHA-256 hash generated for integrity
4. **Metadata**: Schema inferred, statistics calculated
5. **Mint**: NFT created on Hedera Token Service
6. **Verify**: Hash submitted to Consensus Service
7. **Confirm**: Token viewable on HashScan

### Use Cases

- **Data Marketplace**: Sell proprietary datasets as NFTs
- **Research Attribution**: Prove data ownership and provenance
- **Supply Chain**: Tokenize shipment records
- **Financial Reports**: Immutable quarterly earnings
- **IoT Data**: Timestamped sensor data
- **Compliance**: Auditable regulatory submissions

## 🧪 Testing

### Test CSV Tokenization

1. Start dev server: `pnpm dev`
2. Navigate to: `/tokenized-data`
3. Upload: `public/examples/sample-sales.csv`
4. Verify validation passes (15 rows, 7 columns)
5. Mint NFT (requires Hedera credentials)
6. View on HashScan

### Sample Accounts for Analytics

- Testnet: `0.0.3229` (active account)
- Mainnet: `0.0.98` (Hedera treasury)

## 📜 License

MIT License

## 🙏 Acknowledgments

- [Hedera Hashgraph](https://hedera.com/) for the DLT platform
- [Hedera SDK](https://github.com/hashgraph/hedera-sdk-js) for blockchain integration
- [Next.js](https://nextjs.org/) for the framework
- [Tailwind CSS](https://tailwindcss.com/) for styling

## 🔗 Links

- **Hedera Documentation**: https://docs.hedera.com/
- **HTS Guide**: https://docs.hedera.com/hedera/core-concepts/tokens/hedera-token-service-hts-native-tokenization
- **HCS Guide**: https://docs.hedera.com/hedera/sdks-and-apis/hedera-api/consensus/consensus-service
- **Hedera Portal**: https://portal.hedera.com/
- **HashScan Explorer**: https://hashscan.io/

---

**Built with ❤️ for Hedera Hackathon**
