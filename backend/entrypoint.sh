#!/bin/sh
set -e

echo "==> Django migrate"
python manage.py migrate --noinput

echo "==> Django collectstatic"
python manage.py collectstatic --noinput --clear

echo "==> Starting: $@"
exec "$@"
