web: python backend/manage.py migrate --noinput && gunicorn --chdir backend pocketplanner.wsgi:application --bind 0.0.0.0:$PORT
