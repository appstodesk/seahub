set -x
set -u
set -o pipefail

apk update
apk add build-base gettext
npm install -g requirejs
cd /var/lib/seafile/scripts/seahub
export PYTHONPATH=$PWD/../seafile/lib64/python2.6/site-packages:$PWD/thirdpart:$PWD
export PATH=$PATH:thirdpart/Django-1.5.12-py2.6.egg/django/bin
export CCNET_CONF_DIR=$PWD/../../conf
export SEAFILE_CONF_DIR="$CCNET_CONF_DIR"
make dist
