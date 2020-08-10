#!/bin/bash

API="http://localhost:4741"
URL_PATH="/recipe"

curl "${API}${URL_PATH}" \
  --include \
  --request POST \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer ${TOKEN}" \
  --data '{
    "recipe": {
      "recipe": "'"${RECIPE}"'",
      "title": "'"${TITLE}"'",
      "comments": "'"${COMMENTS}"'"
    }
  }'

echo