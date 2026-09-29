#!/bin/zsh

set -u

launcher_dir="${0:A:h}"
node_bin="$(command -v node 2>/dev/null || true)"

if [[ -z "$node_bin" ]]; then
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node "$HOME/.volta/bin/node"; do
    if [[ -x "$candidate" ]]; then
      node_bin="$candidate"
      break
    fi
  done
fi

if [[ -z "$node_bin" ]]; then
  print "Node.js is required. Install Node.js 24 LTS, then launch Studio again."
  read "reply?Press Return to close."
  exit 1
fi

export PATH="${node_bin:h}:$PATH"
cd "$launcher_dir" || exit 1
"$node_bin" "$launcher_dir/app/scripts/launch.mjs"
exit_code=$?

if (( exit_code != 0 )); then
  read "reply?Press Return to close."
fi

exit $exit_code
