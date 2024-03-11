nohup pnpm run start > nohup.log 2>&1 &
echo $! > .pidfile
