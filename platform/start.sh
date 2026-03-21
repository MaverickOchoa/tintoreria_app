#!/bin/bash
python setup_clinic_db.py
uvicorn main:app --host 0.0.0.0 --port $PORT
