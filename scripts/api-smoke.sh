#!/bin/sh
# Smoke run of every API endpoint against a running dev server.
#
# LOCAL DEVELOPMENT ONLY — it registers throwaway accounts, creates research, and
# reads OTP codes straight out of the database, so point it at a dev database.
#
#   bun run dev            # in another terminal
#   sh scripts/api-smoke.sh
#
# Run it from the repository root.
set -u

BASE=http://localhost:3000
JAR=tmp-cookies.txt
STAMP=$(date +%s)
EMAIL="curl-test-$STAMP@example.com"
NEW_EMAIL="curl-test-baru-$STAMP@example.com"
# Must match the dev server's own PAYMENT_WEBHOOK_SECRET; the webhook refuses to
# run at all while the server has none.
PAYMENT_WEBHOOK_SECRET=${PAYMENT_WEBHOOK_SECRET:-local-dev-webhook-secret}
LAST=""

: > "$JAR"

step() { printf '\n--- %s\n' "$1"; }

call() {
    method=$1
    path=$2
    body=${3:-}

    if [ -n "$body" ]; then
        raw=$(curl -sS -X "$method" "$BASE$path" -H 'content-type: application/json' -H "x-webhook-secret: $PAYMENT_WEBHOOK_SECRET" -b "$JAR" -c "$JAR" -d "$body" -w '\n%{http_code}')
    else
        raw=$(curl -sS -X "$method" "$BASE$path" -H 'content-type: application/json' -H "x-webhook-secret: $PAYMENT_WEBHOOK_SECRET" -b "$JAR" -c "$JAR" -w '\n%{http_code}')
    fi

    status=$(printf '%s' "$raw" | tail -n 1)
    LAST=$(printf '%s' "$raw" | sed '$d')
    payload=$(printf '%s' "$LAST" | tr -d '\n' | tr -s ' ')
    printf '%-6s %-44s %s  %s\n' "$method" "$path" "$status" "$(printf '%s' "$payload" | cut -c1-165)"
}

# Reads a pending OTP straight from the database, since the code is stored in the clear.
code() { bun run scripts/db-peek.ts code "$1" "${2:-EMAIL_VERIFICATION}"; }

json_field() {
    node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{let v=JSON.parse(s);for(const k of process.argv[1].split('.').filter(Boolean))v=v?.[k];console.log(v??'')}catch{console.log('')}})" "$1"
}

printf 'email     : %s\nnew email : %s\n' "$EMAIL" "$NEW_EMAIL"

step "1. Auth: register, guard, duplicate, login"
call POST /api/auth/register "{\"name\":\"Curl Tester\",\"email\":\"$EMAIL\",\"password\":\"supersecret1\"}"
call GET  /api/auth/me
call POST /api/auth/login "{\"email\":\"$EMAIL\",\"password\":\"salah\"}"
call POST /api/auth/login "{\"email\":\"$EMAIL\",\"password\":\"supersecret1\"}"
call GET  /api/auth/me
call POST /api/auth/register "{\"name\":\"Curl Tester\",\"email\":\"$EMAIL\",\"password\":\"supersecret1\"}"

step "2. OTP: cooldown, attempts, confirm, idempotency, unknown account"
call POST /api/auth/resend-verification "{\"email\":\"$EMAIL\"}"
call POST /api/auth/confirm-verification "{\"email\":\"$EMAIL\",\"code\":\"000000\"}"
OTP=$(code "$EMAIL")
printf 'otp read from db: %s\n' "$OTP"
call POST /api/auth/confirm-verification "{\"email\":\"$EMAIL\",\"code\":\"$OTP\"}"
call POST /api/auth/confirm-verification "{\"email\":\"$EMAIL\",\"code\":\"$OTP\"}"
call POST /api/auth/resend-verification "{\"email\":\"$EMAIL\"}"
call POST /api/auth/resend-verification "{\"email\":\"nobody-$STAMP@example.com\"}"

step "3. Profile: incomplete, complete, consent rule"
call PATCH /api/user/profile '{"occupation":"Analis"}'
call PATCH /api/user/profile '{"gender":"female","education":"bachelor","province":"DKI Jakarta","city":"Jakarta Selatan","latitude":-6.261493,"longitude":106.8106,"occupation":"Analis"}'
call PATCH /api/user/profile '{"religion":"islam"}'
call PATCH /api/user/profile '{"religion":"islam","religionConsent":true}'

step "4. Research: create, get, update"
call POST /api/research/create
RID=$(printf '%s' "$LAST" | json_field '.data.research.id')
printf 'research id: %s\n' "$RID"
call GET   "/api/research/$RID"
call PATCH "/api/research/$RID" '{"category":"Fintech & Perbankan"}'
call PATCH "/api/research/$RID" '{"title":"QRIS dan perilaku belanja","category":"fintech","targetRespondentCount":25,"tokenPerRespondent":2,"description":"Studi pendahuluan."}'

step "5. Research: criteria and questionnaire"
call POST "/api/research/$RID/create-criteria" '{"criteria":[{"field":"occupation","operator":"EQ","value":"Guru"}]}'
call POST "/api/research/$RID/create-questions" '{"questions":[{"pos":1,"question":"a","questionType":"TEXT"},{"pos":1,"question":"b","questionType":"TEXT"}]}'
call POST "/api/research/$RID/create-questions" '{"questions":[{"pos":1,"question":"Seberapa sering memakai QRIS?","questionType":"SINGLE_CHOICE","choices":[{"pos":1,"n":"A","choiceText":"Sering"},{"pos":2,"n":"B","choiceText":"Jarang"}]},{"pos":2,"question":"Saran","questionType":"TEXT"}]}'
call GET  "/api/research/$RID"

step "6. Wallet, top-up, then publish reserves tokens"
call GET  /api/payment/wallet
call POST "/api/research/$RID/publish"
call POST /api/payment/topup '{"tokenAmount":0}'
call POST /api/payment/topup '{"tokenAmount":1000}'
PAYMENT_ID=$(printf '%s' "$LAST" | json_field '.data.payment.id')
PROVIDER_REF=$(printf '%s' "$LAST" | json_field '.data.payment.providerRef')
printf 'payment id: %s | provider ref: %s\n' "$PAYMENT_ID" "$PROVIDER_REF"
call GET "/api/payment/$PAYMENT_ID"
call POST /api/payment/webhook "{\"providerRef\":\"$PROVIDER_REF\",\"status\":\"PAID\"}"
call POST /api/payment/webhook "{\"providerRef\":\"$PROVIDER_REF\",\"status\":\"PAID\"}"
call GET  /api/payment/wallet
call POST "/api/research/$RID/publish"
call GET  /api/payment/wallet
call POST "/api/research/$RID/create-questions" '{"questions":[{"pos":1,"question":"baru","questionType":"TEXT"}]}'
call PATCH "/api/research/$RID" '{"criteria":[]}'
call PATCH "/api/research/$RID" '{"title":"Judul setelah publish"}'

step "6b. Close returns the unused budget, archiving a closed research releases nothing more"
call POST "/api/research/$RID/close"
call GET  /api/payment/wallet
call POST "/api/research/$RID/close"
call DELETE "/api/research/$RID"
call GET "/api/research/$RID"
call GET "/api/payment/$PAYMENT_ID"

step "7. Email change"
call POST /api/auth/change-email "{\"email\":\"$NEW_EMAIL\",\"password\":\"salah\"}"
call POST /api/auth/change-email "{\"email\":\"$EMAIL\",\"password\":\"supersecret1\"}"
call POST /api/auth/change-email "{\"email\":\"$NEW_EMAIL\",\"password\":\"supersecret1\"}"
call POST /api/auth/confirm-email-change '{"code":"000000"}'
CHANGE_OTP=$(code "$EMAIL" EMAIL_CHANGE)
printf 'email-change otp: %s\n' "$CHANGE_OTP"
call POST /api/auth/confirm-email-change "{\"code\":\"$CHANGE_OTP\"}"
call POST /api/auth/login "{\"email\":\"$NEW_EMAIL\",\"password\":\"supersecret1\"}"
call GET /api/auth/me

step "8. Role gate and logout"
bun run scripts/db-peek.ts roles "$NEW_EMAIL" '["respondent"]'
call POST /api/research/create
bun run scripts/db-peek.ts roles "$NEW_EMAIL" '["researcher","respondent"]'
call POST /api/auth/logout
call GET /api/auth/me
call POST /api/research/create
call DELETE "/api/research/apa-saja"
call POST /api/payment/topup '{"tokenAmount":10}'
call GET /api/payment/wallet

# Clean up after itself — every account this run created carries the timestamp.
# Comment this out when you would rather inspect the rows it produced.
bun run scripts/db-peek.ts purge "$STAMP"

rm -f "$JAR"
printf '\nselesai\n'
