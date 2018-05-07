#!/bin/bash

set -e

echo "set to development mode"

echo "clean tmptest"
rm -rf tmptest

mkdir tmptest

echo "make fake release version"

cp -r testdata/appifi tmptest/appifi

rm -r tmptest/appifi/build

mkdir tmptest/appifi-tarballs

cp -r testdata/appifi-1.0.14-10097392-0d5890cc.tar.gz tmptest/appifi-tarballs

cd tmptest/appifi/

git clone https://github.com/wisnuc/appifi build1  

cd build1

git checkout phi

cd ../ && mkdir build

cp -r build1/src/* build/

cp build1/package.json build/

rm -r build1

cd build

sudo npm install

apt-get update

echo "Install avahi"
apt-get -y install avahi-daemon avahi-utils

echo "Install essential packages for whole system"
apt-get -y install build-essential python-minimal openssh-server btrfs-tools imagemagick ffmpeg samba udisks2 curl