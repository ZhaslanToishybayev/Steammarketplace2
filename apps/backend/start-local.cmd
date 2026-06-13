@echo off
set NODE_ENV=development
set PORT=3001
node server.js 1> backend.out.log 2> backend.err.log
