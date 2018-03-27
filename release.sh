#!/bin/bash

set -e

echo "after this operation other branchs are corrupted"

# wisnuc-bootstrap-linux-x64
# wisnuc-bootstrap-linux-x64-sha256 
# wisnuc-bootstrap-linux-a64
# wisnuc-bootstrap-linux-a64-sha256 

git checkout origin/staging -- wisnuc-bootstrap-linux-x64
git checkout origin/staging -- wisnuc-bootstrap-linux-x64-sha256

# reset 
rm -rf .git
git init
git add .
git commit -a -m 'reinit'

# set remote and switch to release branch
git remote add origin https://github.com/wisnuc/wisnuc-bootstrap
git checkout -b release
git push --force --set-upstream origin release

