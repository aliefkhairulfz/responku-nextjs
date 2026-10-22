#!/bin/sh
# Smoke run of every API endpoint against a running dev server.
#
# LOCAL DEVELOPMENT ONLY — it registers throwaway accounts, creates research, and
# reads OTP codes straight out of the database, so point it at a dev database.
#
#   MIDTRANS_SERVER_KEY=local-dev-midtrans-server-key \
#   MIDTRANS_SNAP_BASE_URL=http://127.0.0.1:4566 \
#   bun run dev            # in another terminal
#   sh scripts/api-smoke.sh
#
# Both Midtrans variables are needed: the server key lets the webhook verify the
# notifications this script signs, and the Snap base URL points a top-up at the
# stub below instead of the real Midtrans, which would reject the throwaway key.
#
# Run it from the repository root.
set -u

BASE=http://localhost:3000
JAR=tmp-cookies.txt
STAMP=$(date +%s)
EMAIL="curl-test-$STAMP@example.com"
NEW_EMAIL="curl-test-baru-$STAMP@example.com"
# Must match the dev server's own MIDTRANS_SERVER_KEY: the webhook verifies the
# signature Midtrans would have signed, and refuses to run at all while the server
# has no key.
MIDTRANS_SERVER_KEY=${MIDTRANS_SERVER_KEY:-local-dev-midtrans-server-key}
LAST=""

: > "$JAR"

# A throwaway Snap endpoint, so a top-up does not depend on real Midtrans
# credentials. The dev server has to be started with
# MIDTRANS_SNAP_BASE_URL=http://127.0.0.1:4566 for requests to land here.
node -e '
const http = require("node:http")
http
    .createServer((req, res) => {
        let body = ""
        req.on("data", (chunk) => (body += chunk))
        req.on("end", () => {
            let order = "unknown"
            try {
                order = JSON.parse(body).transaction_details.order_id
            } catch {}
            res.writeHead(201, { "content-type": "application/json" })
            res.end(JSON.stringify({ token: "stub-" + order, redirect_url: "http://127.0.0.1:4566/redirect/" + order }))
        })
    })
    .listen(4566, "127.0.0.1")
' >/dev/null 2>&1 &
SNAP_STUB_PID=$!
trap 'kill "$SNAP_STUB_PID" 2>/dev/null' EXIT

step() { printf '\n--- %s\n' "$1"; }

call() {
    method=$1
    path=$2
    body=${3:-}

    if [ -n "$body" ]; then
        raw=$(curl -sS -X "$method" "$BASE$path" -H 'content-type: application/json' -b "$JAR" -c "$JAR" -d "$body" -w '\n%{http_code}')
    else
        raw=$(curl -sS -X "$method" "$BASE$path" -H 'content-type: application/json' -b "$JAR" -c "$JAR" -w '\n%{http_code}')
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

# Signs a Midtrans notification the way Midtrans would: sha512 of
# order_id + status_code + gross_amount + server_key.
notify() {
    order_id=$1
    gross=$2
    transaction_status=${3:-settlement}
    signature=$(node -e "const c=require('node:crypto');process.stdout.write(c.createHash('sha512').update(process.argv[1]+'200'+process.argv[2]+process.argv[3]).digest('hex'))" "$order_id" "$gross" "$MIDTRANS_SERVER_KEY")

    call POST /api/payment/webhook \
        "{\"order_id\":\"$order_id\",\"status_code\":\"200\",\"gross_amount\":\"$gross\",\"transaction_status\":\"$transaction_status\",\"signature_key\":\"$signature\"}"
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

step "3b. Support tickets"
call POST /api/ticket '{"category":"DISPUTE","subject":"Permohonan banding penolakan","description":"Pengisian kuesioner sudah selesai dengan cermat sesuai instruksi, mohon review manual."}'
call POST /api/ticket '{"category":"dispute","subject":"kategori huruf kecil","description":"Nilai enum tersimpan huruf besar, jadi ini harus ditolak 422."}'
call POST /api/ticket '{"category":"LAIN","subject":"x","description":"pendek"}'
call GET  /api/ticket
call GET  "/api/ticket?status=REVIEW"
call GET  "/api/ticket?status=bogus"
call POST /api/ticket/whatever '{"category":"OTHER","subject":"Salah path","description":"Ini seharusnya dijawab 404 bukan dibuat."}'

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
GROSS=$(printf '%s' "$LAST" | json_field '.data.payment.amountIdr')
REDIRECT=$(printf '%s' "$LAST" | json_field '.data.redirectUrl')
printf 'payment id: %s | order id: %s | gross: %s\nredirect: %s\n' "$PAYMENT_ID" "$PROVIDER_REF" "$GROSS" "$REDIRECT"
call GET "/api/payment/$PAYMENT_ID"
# A notification nobody signed must not reach the wallet.
call POST /api/payment/webhook "{\"order_id\":\"$PROVIDER_REF\",\"status_code\":\"200\",\"gross_amount\":\"$GROSS\",\"transaction_status\":\"settlement\",\"signature_key\":\"deadbeef\"}"
notify "$PROVIDER_REF" "$GROSS" settlement
notify "$PROVIDER_REF" "$GROSS" settlement
notify "$PROVIDER_REF" "$GROSS" refund
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
call GET /api/ticket
call POST /api/ticket '{"category":"OTHER","subject":"Tanpa sesi","description":"Permintaan tanpa login harus ditolak dengan 401."}'
call DELETE "/api/research/apa-saja"
call POST /api/payment/topup '{"tokenAmount":10}'
call GET /api/payment/wallet

# Clean up after itself — every account this run created carries the timestamp.
# Comment this out when you would rather inspect the rows it produced.
bun run scripts/db-peek.ts purge "$STAMP"

rm -f "$JAR"
printf '\nselesai\n'
