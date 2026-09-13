#!/bin/bash
echo "Starting Uvicorn..."
python -u -m uvicorn main:app --host 0.0.0.0 --port $PORT 2>&1 | tee uvicorn_output.log
exit_status=${PIPESTATUS[0]}
echo "Uvicorn exited with status: $exit_status"
exit $exit_status
