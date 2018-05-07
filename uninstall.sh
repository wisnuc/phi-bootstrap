#!/bin/bash

set -e

echo "uninstall appifi && clean volumes"

#umount blocks
umount /dev/sdb
umount /dev/sdc

rm -r /run/phicomm/

rm -r /etc/phicomm/
