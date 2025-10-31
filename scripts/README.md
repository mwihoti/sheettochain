# Hedera Utility Scripts

Collection of utility scripts for Hedera integration setup and testing.

## Available Scripts

### 1. Test Connection
**File**: `test-connection.mjs`  
**Purpose**: Verify Hedera credentials and network connectivity  
**Usage**:
```bash
pnpm test:connection
# or
node scripts/test-connection.mjs
```

**What it does**:
- ✅ Validates environment variables
- ✅ Tests private key format
- ✅ Queries account balance
- ✅ Checks for sufficient funds
- ✅ Provides helpful error messages

**Example Output**:
```
✅ All tests passed!
═══════════════════════════════════════════════════════════
👤 Account: 0.0.6990992
💰 Balance: 999.93967645 ℏ
🌐 Network: testnet
═══════════════════════════════════════════════════════════
```

---

### 2. Create HCS Topic
**File**: `create-hcs-topic.mjs` (JavaScript) or `create-hcs-topic.ts` (TypeScript)  
**Purpose**: Create Hedera Consensus Service topic for CSV hash verification  
**Usage**:
```bash
pnpm create:topic
# or
node scripts/create-hcs-topic.mjs
# or (TypeScript)
npx tsx scripts/create-hcs-topic.ts
```

**What it does**:
- ✅ Creates new HCS topic
- ✅ Sets admin and submit keys
- ✅ Adds descriptive memo
- ✅ Returns topic ID and HashScan URL

**Example Output**:
```
✅ Topic created successfully!
═══════════════════════════════════════════════════════════
📋 Topic ID: 0.0.7170337
🔗 Network: testnet
👤 Admin: 0.0.6990992
═══════════════════════════════════════════════════════════
🔍 View on HashScan: https://hashscan.io/testnet/topic/0.0.7170337
```

**Next Steps**:
After creating a topic, add the ID to your `.env.local`:
```bash
HCS_TOPIC_ID=0.0.7170337
```

---

## Setup Instructions

### First-Time Setup

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Hedera credentials
   ```

3. **Test Connection**:
   ```bash
   pnpm test:connection
   ```

4. **Create HCS Topic** (optional but recommended):
   ```bash
   pnpm create:topic
   ```

5. **Update .env.local** with the topic ID from step 4

6. **Start Development Server**:
   ```bash
   pnpm dev
   ```

---

## Environment Variables

Required in `.env.local`:

```bash
# Required
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=302e...YOUR_PRIVATE_KEY
HEDERA_NETWORK=testnet

# Optional (improves security)
HCS_TOPIC_ID=0.0.YOUR_TOPIC_ID

# Public
NEXT_PUBLIC_HEDERA_NETWORK=testnet
```

### Important Notes

- **Use ED25519 Keys**: Private key should start with `302e...`
- **DER Encoding**: Not HEX format (`0x...`)
- **Testnet First**: Always test on testnet before mainnet
- **Never Commit**: `.env.local` is in `.gitignore`

---

## Troubleshooting

### "Invalid Signature" Error
```
❌ Error: INVALID_SIGNATURE
```
**Solution**: 
- Verify Account ID and Private Key match
- Use ED25519 key, not ECDSA
- Check key format (should start with `302e...`)

### "Insufficient Balance" Error
```
⚠️ Warning: Account balance is 0 HBAR
```
**Solution**:
- Get free testnet HBAR at https://portal.hedera.com/
- Wait 30-60 seconds for balance to update
- Run `pnpm test:connection` to verify

### "Cannot Find Module" Error
```
❌ Error: Cannot find module 'dotenv'
```
**Solution**:
```bash
pnpm install
```

### "Connection Timeout" Error
```
❌ Connection test failed: timeout
```
**Solution**:
- Check internet connection
- Verify Hedera network status
- Try different network (testnet/previewnet)

---

## File Structure

```
scripts/
├── test-connection.mjs      # Connection validator (JavaScript)
├── create-hcs-topic.mjs     # Topic creator (JavaScript)
├── create-hcs-topic.ts      # Topic creator (TypeScript)
└── README.md                # This file
```

---

## Common Workflows

### Daily Development
```bash
pnpm dev                     # Start server
# Visit http://localhost:3000/tokenized-data
# Upload CSV and mint NFT
```

### Verify Setup
```bash
pnpm test:connection        # Check credentials
# Should show account balance
```

### Create New Topic
```bash
pnpm create:topic           # Create HCS topic
# Add returned ID to .env.local
# Restart dev server
```

### Reset Everything
```bash
rm .env.local               # Remove credentials
cp .env.local.example .env.local
# Start from scratch
```

---

## Security Best Practices

1. ✅ Never commit `.env.local`
2. ✅ Use separate accounts for dev/prod
3. ✅ Rotate keys periodically
4. ✅ Monitor account balance
5. ✅ Use testnet for development
6. ✅ Keep private keys secure

---

## Additional Resources

- **Hedera Portal**: https://portal.hedera.com/
- **Hedera Docs**: https://docs.hedera.com/
- **SDK Documentation**: https://docs.hedera.com/hedera/sdks-and-apis
- **HashScan Explorer**: https://hashscan.io/

---

**Need Help?**

1. Check the main README.md
2. Review PHASE_4_5_COMPLETE.md
3. Run the demo at http://localhost:3000/demo
4. Check Hedera documentation

🚀 Happy building on Hedera!
