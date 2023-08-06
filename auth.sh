if [[ "${GITHUB_APP_ID}" != "" ]] && [[ -e "${GITHUB_APP_PRIVATE_KEY}" ]] ; then
    #First get a unix epoch for 5 minutes from now
    EXP_TIME=$(( $(date +%s) + $(( 5 * 60 )) ))
    # Create a temporary JWT for API access
    GITHUB_JWT=$(jwt encode -A RS256 -S @$GITHUB_APP_PRIVATE_KEY -i $GITHUB_APP_ID -P iat=$(date +%s) -e=$EXP_TIME)
    # Request installation information; note that this assumes there's just one installation (this is a private GitHub app);
    APP_TOKEN_URL=$(curl -s -H "Authorization: Bearer ${GITHUB_JWT}" -H "Accept: application/vnd.github.v3+json" https://api.github.com/app/installations|jq -r .[0].access_tokens_url)
    # Now POST to the installation token URL to generate a new access token we can use to with with the gh and hub command lines
    export GITHUB_TOKEN=$( curl -s -X POST -H "Authorization: Bearer ${GITHUB_JWT}" -H "Accept: application/vnd.github.v3+json" ${APP_TOKEN_URL} | jq -r '.token' |gh auth login --with-token)
    # Configure gh as an auth provider for git so we can use git push / pull / fetch with github.com URLs
    #gh auth login --with-token< mytoken.txt
    echo Successfully authorized as app
fi