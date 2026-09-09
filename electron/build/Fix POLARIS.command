#!/bin/bash
# Run this once, after dragging POLARIS into Applications, if macOS says
# POLARIS "cannot be opened because the developer cannot be verified" or
# "is damaged and can't be opened."
#
# POLARIS isn't notarized by Apple yet, so downloaded copies get a
# quarantine flag that blocks the first launch. This clears it.

APP="/Applications/POLARIS.app"

if [ ! -d "$APP" ]; then
  echo "Couldn't find $APP."
  echo "Drag POLARIS.app into your Applications folder first, then run this again."
  read -p "Press Return to close..."
  exit 1
fi

echo "Fixing $APP..."
xattr -cr "$APP"

if [ $? -eq 0 ]; then
  echo "Done. You can now open POLARIS normally from Applications."
else
  echo "Something went wrong. Try running this manually in Terminal:"
  echo "  xattr -cr \"$APP\""
fi

read -p "Press Return to close..."
