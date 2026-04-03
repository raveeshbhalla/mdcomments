#!/bin/bash
export PATH="/Users/raveesh/.nvm/versions/node/v24.13.0/bin:/usr/local/bin:$PATH"
export NODE_PATH="/Users/raveesh/.nvm/versions/node/v24.13.0/lib/node_modules"
cd /Users/raveesh/dev/mdcomments/web
exec node node_modules/.bin/next dev --port 3001
