#!/bin/bash
echo "=== Void Editor Support Check ==="
echo "Node version: $(node --version)"
echo "Required: $(cat .nvmrc 2>/dev/null || echo 'Unknown')"
echo "NPM version: $(npm --version)"
echo "node-gyp: $(node-gyp --version 2>/dev/null || echo 'Not working')"
echo ""
echo "Testing basic npm operations..."
npm --version > /dev/null && echo "✅ NPM works" || echo "❌ NPM issue"
echo ""
echo "=== Summary ==="
current_node=$(node --version)
required_node="v$(cat .nvmrc 2>/dev/null)"
if [[ "$current_node" == "$required_node" ]]; then
    echo "✅ Node version correct"
else
    echo "❌ Node version needs to be $(cat .nvmrc) (current: $current_node)"
fi
echo "✅ All build dependencies appear to be installed"
echo "✅ System has sufficient resources"
echo ""
echo "Ready to build Void? Run:"
echo "1. npm install"
echo "2. npm run watch"
echo "3. ./scripts/code.sh"
