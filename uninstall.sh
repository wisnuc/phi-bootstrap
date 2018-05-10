#!/bin/bash

set -e

echo "uninstall appifi && clean volumes"

#umount blocks
umount /dev/sdb || echo "umount /dev/sdb failed"
umount /dev/sdc || echo "umount /dev/sdc failed"

echo "clean boundVolume"
rm -r /run/phicomm/

rm -r /etc/phicomm/
