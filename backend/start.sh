#!/bin/bash
flask db upgrade
gunicorn --workers=1 --threads=2 app:app

