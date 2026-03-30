#!/bin/bash
# update-addresses.sh
# Usage: ./scripts/update-addresses.sh <contract_name> <address>
# Example: ./scripts/update-addresses.sh MockUSDC 0xabcdef1234567890

set -e

ADDRESSES_FILE="$(dirname "$0")/../deployed-addresses-flow.json"

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <contract_name> <address>"
  echo "Example: $0 MockUSDC 0xabcdef1234567890"
  exit 1
fi

CONTRACT_NAME="$1"
ADDRESS="$2"

# Update the JSON file using Python (available on most systems)
python3 -c "
import json, sys

with open('$ADDRESSES_FILE', 'r') as f:
    data = json.load(f)

data['contracts']['$CONTRACT_NAME'] = '$ADDRESS'

with open('$ADDRESSES_FILE', 'w') as f:
    json.dump(data, f, indent=2)

print(f'Updated $CONTRACT_NAME = $ADDRESS in deployed-addresses-flow.json')
"

echo ""
echo "Next steps:"
echo "1. Update frontend/src/lib/contracts/addresses.ts FLOW_ADDRESSES.$CONTRACT_NAME"
echo "2. Update backend .env: FLOW_$(echo $CONTRACT_NAME | tr '[:lower:]' '[:upper:]')_ADDRESS=$ADDRESS"
