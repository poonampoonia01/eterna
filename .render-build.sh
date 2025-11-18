#!/bin/bash
set -e
npm install
npm run prisma:generate
npm run build
ls -la dist/

