#!/bin/bash

set -e

echo "set to development mode"

phiFolder=`pwd`

tmpFolder="$phiFolder/tmptest"

tarballsFolder="$tmpFolder/appifi-tarballs"

appifiFolder="$tmpFolder/appifi"

archiveFolder="$appifiFolder/old_appifi"

echo $phiFolder
echo $appifiFolder

sudo npm install yarn -g

cleanAndConfEnv()
{
    echo "clean tmptest"

    rm -rf $tmpFolder

    mkdir $tmpFolder

    echo "make fake tarball"

    mkdir $tarballsFolder

    cp -r testdata/appifi-1.0.14-10097392-0d5890cc.tar.gz $tarballsFolder
}

makeAppifi()
{
    echo "make fake release version"

    cp -r testdata/appifi $tmpFolder

    cd $appifiFolder

    rm -r "$appifiFolder/build"

    git clone https://github.com/wisnuc/appifi old_appifi

    cd old_appifi

    git checkout phi

    sudo yarn

    cd ../ && mkdir build

    cp -r old_appifi/src/* build/

    cp old_appifi/package.json build/

    cp -r old_appifi/node_modules build/

    # cd build
    # sudo npm install

    apt-get update

    echo "Install avahi"
    apt-get -y install avahi-daemon avahi-utils

    echo "Install essential packages for whole system"
    apt-get -y install build-essential python-minimal openssh-server btrfs-tools imagemagick ffmpeg samba udisks2 curl

}

updateAppifi()
{
  echo "update appifi"
  cd $archiveFolder
  git checkout phi
  git pull

  rm -rf "$appifiFolder/build"
  mkdir "$appifiFolder/build"

  cp -r "$archiveFolder/src/"* "$appifiFolder/build/"
  cp "$archiveFolder/package.json" "$appifiFolder/build/"
  
  if [ ! -d "$archiveFolder/node_modules" ]; then
    cd $archiveFolder && sudo yarn
  fi

  cp -r "$archiveFolder/node_modules" "$appifiFolder/build/"
}

skipUpdate="--skip-install"

if [ ! -d $archiveFolder ]; then
    cleanAndConfEnv
    makeAppifi
else
    updateAppifi
    if [ $1x != "$skipUpdate"x ]; then
        echo "===== npm install ====="
        rm -rf "$archiveFolder/node_modules"
        cd $archiveFolder
        sudo yarn
        rm -rf "$appifiFolder/build/node_modules"
        cp -r "$archiveFolder/node_modules" "$appifiFolder/build/"
    else
        echo "===== skip install ====="
    fi
fi
