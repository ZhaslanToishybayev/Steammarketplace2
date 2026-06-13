@echo off
set NODE_ENV=production
set PORT=3000
node server.js 1> frontend.out.log 2> frontend.err.log
