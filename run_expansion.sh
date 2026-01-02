#!/bin/bash

# Run expand_dataset.py with progress output
echo "Starting dataset expansion..."
echo "This will fetch from Bechdel Test API (may take 10-30 seconds per API call)"
echo ""

cd /Users/mgifford/show-suggester

/Users/mgifford/show-suggester/.venv/bin/python -u expand_dataset.py 2>&1 &
SCRIPT_PID=$!

echo "Script PID: $SCRIPT_PID"
echo "Monitoring output..."
echo ""

# Monitor for 2 minutes, showing output
for i in {1..24}; do
    sleep 5
    if ! kill -0 $SCRIPT_PID 2>/dev/null; then
        echo "Script completed!"
        break
    fi
    echo "Still running... (${i}0 seconds elapsed)"
done

# Kill if still running
if kill -0 $SCRIPT_PID 2>/dev/null; then
    echo "Script still running after 2 minutes, may be making API calls..."
    echo "Waiting for completion..."
    wait $SCRIPT_PID
fi

echo ""
echo "Done!"
