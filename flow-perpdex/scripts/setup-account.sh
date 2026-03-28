#!/bin/bash
# setup-account.sh
# Sets the deployer address in flow.json (and generates pkey file location hint).
# Usage: ./scripts/setup-account.sh <address> <private_key>
# Example: ./scripts/setup-account.sh 0xabc123def456 abc123...

set -e

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <address> <private_key>"
  echo "Example: $0 0xabc123def456 abc123privatekey..."
  exit 1
fi

ADDRESS="$1"
PRIVATE_KEY="$2"
ROOT="$(dirname "$0")/.."

# Replace <DEPLOY_ADDRESS> in flow.json
sed -i "s/<DEPLOY_ADDRESS>/$ADDRESS/g" "$ROOT/flow.json"

# Write private key to panta-testnet.pkey
echo "$PRIVATE_KEY" > "$ROOT/panta-testnet.pkey"
chmod 600 "$ROOT/panta-testnet.pkey"

echo "✓ flow.json updated with address: $ADDRESS"
echo "✓ panta-testnet.pkey written"
echo ""
echo "Next: flow project deploy --network testnet"
