#! /bin/bash

cd ./frontend 
bun install
bun run build

cd ..
cd ./docs
npm install
npm run build

cp index.html ../frontend/dist/docs.html
